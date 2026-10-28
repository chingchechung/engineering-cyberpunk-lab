import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAssignmentSession } from "../src/education/assignments/assignment-session.js";
import { questionResources, completionFormUrl, setExternalLink } from "../src/education/learningResources.js";

const fixture = (version, id) => JSON.parse(readFileSync(new URL(`./fixtures/${version === 2 ? "v2/" : ""}${id}.json`, import.meta.url)));

test("Demo Mode has no fabricated question, explanation or Form resources even at 5/5", () => {
  const session = createAssignmentSession();
  for (const question of session.questions) {
    session.submit(question.id, question.answer);
    assert.deepEqual(questionResources(session, question), { questionVideoUrl: null, explanationVideoUrl: null, explanationText: null });
  }
  assert.equal(session.complete, true);
  assert.equal(completionFormUrl(session), null);
});

for (const version of [1, 2]) for (const [id, total] of [["S01", 4], ["S02", 5]]) {
  test(`v${version} ${total}-question resources follow existing passes and completion`, () => {
    const session = createAssignmentSession();
    session.activate(fixture(version, id), `${id}.json`);
    for (const [index, question] of session.questions.entries()) {
      const before = questionResources(session, question);
      assert.equal(before.questionVideoUrl, question.questionVideoUrl);
      assert.equal(before.explanationVideoUrl, null);
      assert.equal(before.explanationText, null);
      assert.equal(completionFormUrl(session), null);
      const accepted = version === 1 ? question.correctOption : question.correctOptions.at(-1);
      const wrong = [..."ABCD"].find((label) => label !== accepted &&
        !(question.correctOptions ?? []).includes(label) && "ABCD".indexOf(label) < question.options.length);
      if (wrong) {
        assert.equal(session.answer(question.id, wrong), false);
        assert.equal(questionResources(session, question).explanationVideoUrl, null);
      }
      assert.equal(session.answer(question.id, accepted), true);
      assert.equal(session.count, index + 1);
      assert.equal(questionResources(session, question).explanationVideoUrl, question.explanationVideoUrl);
      if (wrong) {
        session.answer(question.id, wrong);
        assert.equal(questionResources(session, question).explanationVideoUrl, question.explanationVideoUrl);
      }
      if (index < total - 1) assert.equal(completionFormUrl(session), null);
    }
    assert.equal(completionFormUrl(session), session.unit.googleFormUrl);
    assert.equal(session.count, total);
  });
}

test("explanation text preserves line breaks and literal markup, but blank text is omitted", () => {
  const session = createAssignmentSession(), data = fixture(2, "S01");
  data.questions[0].explanationText = "First line\n<script>literal</script>\n測試";
  data.questions[1].explanationText = " \n ";
  session.activate(data, "S01.json");
  session.answer("Q01", "A"); session.answer("Q02", "C");
  assert.equal(questionResources(session, session.question("Q01")).explanationText, data.questions[0].explanationText);
  assert.equal(questionResources(session, session.question("Q02")).explanationText, null);
});

test("valid replacement clears stale resources; rejected replacement preserves the completed unit", () => {
  const session = createAssignmentSession();
  session.activate(fixture(1, "S01"), "S01.json");
  for (const question of session.questions) session.answer(question.id, question.correctOption);
  const question = session.question("Q01"), url = completionFormUrl(session);
  assert.throws(() => session.activate({ ...fixture(2, "S02"), unknown: true }, "S02.json"));
  assert.equal(completionFormUrl(session), url);
  assert.equal(questionResources(session, question).explanationVideoUrl, question.explanationVideoUrl);
  session.activate(fixture(2, "S02"), "S02.json");
  assert.deepEqual(questionResources(session, question), { questionVideoUrl: null, explanationVideoUrl: null, explanationText: null });
  assert.equal(completionFormUrl(session), null);
});

test("external links retain the exact validated URL and remove stale hrefs", () => {
  const attributes = new Map();
  const link = { setAttribute: (key, value) => attributes.set(key, value), removeAttribute: (key) => attributes.delete(key) };
  const url = "https://youtube.com/watch?si=abc_DEF-12&v=ChtmE09BSy0&t=30#t=20";
  setExternalLink(link, url);
  assert.equal(link.hidden, false);
  assert.equal(link.target, "_blank");
  assert.equal(link.rel, "noopener noreferrer");
  assert.equal(attributes.get("href"), url);
  setExternalLink(link, null);
  assert.equal(link.hidden, true);
  assert.equal(attributes.has("href"), false);
});
