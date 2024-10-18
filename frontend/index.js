console.log("hello world");
const sampleInput = [
  ["null", "null", "null", "null", "null", "null", "null"],
  ["null", "null", "null", "null", "null", "null", "null"],
  ["null", "null", "null", "null", "null", "null", "null"],
  ["null", "null", "#", "#", "null", "null", "null"],
  ["null", "null", "#", "null", "null", "null", "null"],
  ["null", "null", "null", "null", "null", "null", "null"],
  ["null", "null", "null", "null", "null", "null", "null"],
];

const nodeCreationData = [
  { y: 2.75, x: 2.5 },
  { y: 1.75, x: 2.5 },
  { y: 2.0, x: 3.0 },
  { y: 2.0, x: 2.0 },
  { y: 2.5, x: 2.0 },
  { y: 2.5, x: 3.0 },
  { y: 2.75, x: 3.5 },
  { y: 1.75, x: 3.5 },
  { y: 2.0, x: 4.0 },
  { y: 2.0, x: 3.0 },
  { y: 2.5, x: 3.0 },
  { y: 2.5, x: 4.0 },
  { y: 3.5, x: 2.0 },
  { y: 2.5, x: 2.0 },
  { y: 2.75, x: 2.5 },
  { y: 2.75, x: 1.5 },
  { y: 3.25, x: 1.5 },
  { y: 3.25, x: 2.5 },
];

const entry = document.querySelector(".entry");

function positionHexagons() {
  const containerWidth = entry.getBoundingClientRect().width * Math.sqrt(3);
  const containerHeight = (entry.getBoundingClientRect().height * 4) / 3;

  console.log(containerWidth, containerHeight);

  const maximumWidth = Math.floor(containerWidth / sampleInput[0].length);
  const maximumHeight = Math.floor(containerHeight / sampleInput.length);

  const maxPossibleSize = maximumHeight / 2;
  const maxPossibleWidthGivenSize = maxPossibleSize * Math.sqrt(3);

  console.log(
    `maxWidth: ${maximumWidth}, maxHeight: ${maximumHeight}, maxPossibleSize: ${maxPossibleSize}, maxPossibleWidthGivenSize: ${maxPossibleWidthGivenSize}`
  );
  let polygonHeight;
  if (maxPossibleWidthGivenSize > maximumWidth) {
    polygonHeight = (maximumWidth / Math.sqrt(3)) * 2;
  } else {
    polygonHeight = maximumHeight;
  }
  let size = polygonHeight / 2;
  let polygonWidth = size * Math.sqrt(3);
  let margin = 0;
  let vert = (3 / 2) * size;
  let horiz = Math.sqrt(3) * size;

  entry.innerHTML = "";

  for (let r = 0; r < sampleInput.length; r++) {
    let horiz_offset = r % 2 == 1 ? horiz / 2 : 0;
    for (let c = 0; c < sampleInput[r].length; c++) {
      if (sampleInput[r][c] !== "null") {
        const poly = document.createElement("div");
        poly.classList.add("polygon");
        poly.dataset.row = r;
        poly.dataset.col = c;
        poly.style.height = `${polygonHeight}px`;
        poly.addEventListener("click", () => {
          console.log(`(${r}, ${c})`);
        });

        let x = c * horiz + horiz_offset + margin * c;
        let y = r * vert + margin * r;
        poly.style.transform = `translate(${x}px, ${y}px)`;

        entry.appendChild(poly);
      }
    }
  }
  renderNodes(polygonHeight, polygonWidth);
}

function renderNodes(height, width) {
  let yOff = (1 / 2) * height - (1 / 16) * height;
  for (let i = 0; i < nodeCreationData.length; i++) {
    const node = document.createElement("div");
    node.classList.add("node");
    node.style.height = `${height / 8}px`;
    node.style.aspectRatio = "1/1";
    node.style.borderRadius = "50%";
    node.style.backgroundColor = "lightgray";
    node.style.opacity = "0.6";
    node.style.position = "absolute";
    node.style.transform = `translate(${nodeCreationData[i].x * width}px, ${
      nodeCreationData[i].y * height + yOff
    }px)`;
    node.dataset.row = nodeCreationData[i].y;
    node.dataset.col = nodeCreationData[i].x;
    entry.appendChild(node);
  }
}

positionHexagons();

window.addEventListener("resize", positionHexagons);
