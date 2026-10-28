"""Private localhost Apache HTTPS test host. Never edits system/server config."""
from contextlib import contextmanager
import base64,getpass,grp,hashlib,os,socket,ssl,subprocess,time
from pathlib import Path
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]

@contextmanager
def apache_host(document_root,work):
    work=Path(work);work.mkdir(parents=True,exist_ok=True)
    cert=work/'localhost.crt';key=work/'localhost.key'
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost',
                    '-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',str(key),'-out',str(cert)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    pub=subprocess.check_output(['openssl','x509','-in',str(cert),'-pubkey','-noout'])
    der=subprocess.run(['openssl','pkey','-pubin','-outform','der'],input=pub,capture_output=True,check=True).stdout
    spki=base64.b64encode(hashlib.sha256(der).digest()).decode()
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    httpd=os.environ.get('APACHE_HTTPD','/usr/sbin/apache2');modules=Path(os.environ.get('APACHE_MODULES','/usr/lib/apache2/modules'))
    loads=['mpm_event','authz_core','authz_host','mime','dir','ssl','socache_shmcb','headers','setenvif']
    config=work/'httpd.conf'
    config.write_text('\n'.join([
      f'ServerRoot "{work}"',f'PidFile "{work}/httpd.pid"',f'Listen 127.0.0.1:{port}','ServerName localhost',
      *[f'LoadModule {m}_module "{modules}/mod_{m}.so"' for m in loads],
      f'User {getpass.getuser()}',f'Group {grp.getgrgid(os.getgid()).gr_name}',
      f'ErrorLog "{work}/error.log"','LogLevel warn',f'DocumentRoot "{document_root}"','TypesConfig /etc/mime.types',
      'SSLEngine on',f'SSLCertificateFile "{cert}"',f'SSLCertificateKeyFile "{key}"','SSLProtocol -all +TLSv1.2 +TLSv1.3',
      f'<Directory "{document_root}">','AllowOverride None','Require all granted',f'Include "{ROOT}/deployment/apache-common.conf"','</Directory>',
      'ErrorDocument 404 default','ServerTokens Prod','ServerSignature Off'])+'\n', encoding="utf-8")
    log=open(work/'process.log','w', encoding="utf-8");process=subprocess.Popen([httpd,'-f',str(config),'-DFOREGROUND'],stdout=log,stderr=log)
    origin=f'https://127.0.0.1:{port}';context=ssl.create_default_context(cafile=str(cert))
    try:
        for _ in range(150):
            if process.poll() is not None:raise RuntimeError((work/'process.log').read_text(encoding="utf-8")+(work/'error.log').read_text(encoding="utf-8") if (work/'error.log').exists() else (work/'process.log').read_text(encoding="utf-8"))
            try:
                with urlopen(origin+'/',context=context,timeout=1):break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('Apache startup timed out')
        yield {'origin':origin,'context':context,'spki':spki,'cert':str(cert),'version':subprocess.check_output([httpd,'-v'],text=True, encoding="utf-8").splitlines()[0]}
    finally:
        process.terminate()
        try:process.wait(timeout=10)
        except subprocess.TimeoutExpired:process.kill();process.wait()
        log.close()
