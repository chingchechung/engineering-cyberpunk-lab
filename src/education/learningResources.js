// Same validated-session projections as Engineering City Lab v1.0.0
// js/education-ui.js (38b1dfd). No second answer/completion state or URL rewriting.
export function questionResources(session, question) {
  const active = session.mode === "assignment" && session.questions.includes(question);
  const passed = active && session.hasPassed(question.id);
  return {
    questionVideoUrl: active ? question.questionVideoUrl : null,
    explanationVideoUrl: passed ? question.explanationVideoUrl : null,
    explanationText: passed && question.explanationText?.trim() ? question.explanationText : null,
  };
}

export function completionFormUrl(session) {
  return session.mode === "assignment" && session.complete ? session.unit.googleFormUrl : null;
}

export function setExternalLink(element, url) {
  element.hidden = !url;
  element.target = "_blank";
  element.rel = "noopener noreferrer";
  if (url) element.setAttribute("href", url);
  else element.removeAttribute("href");
}
