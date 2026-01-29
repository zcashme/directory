export function getTextareaCaretCoords(textarea, position) {
  if (!textarea) {
    return { left: 0, top: 0, height: 0 };
  }

  const style = window.getComputedStyle(textarea);
  const div = document.createElement("div");
  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
    "MozTabSize",
  ];

  properties.forEach((prop) => {
    div.style[prop] = style[prop];
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";
  div.style.overflow = "hidden";
  div.style.width = `${textarea.offsetWidth}px`;

  const value = textarea.value || "";
  div.textContent = value.substring(0, position);

  const span = document.createElement("span");
  span.textContent = value.substring(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);
  div.scrollTop = textarea.scrollTop;
  div.scrollLeft = textarea.scrollLeft;

  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  document.body.removeChild(div);

  return {
    left: spanRect.left - divRect.left,
    top: spanRect.top - divRect.top,
    height: spanRect.height,
  };
}
