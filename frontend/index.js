console.log("hello world");
const sampleInput = [
  ["null", "null", "null", "null", "null", "null", "null"],
  ["null", "Wood", "Brick", "Wood", "Brick", "null", "null"],
  ["null", "Brick", "Wood", "Sheep", "Wood", "Rock", "null"],
  ["Wheat", "Wheat", "Wheat", "Wheat", "Wheat", "Wheat", "null"],
  ["null", "Stone", "Wheat", "Wheat", "Stone", "Stone", "null"],
  ["null", "Rock", "Wheat", "Brick", "Wheat", "Wood", "null"],
  ["null", "null", "null", "null", "null", "null", "null"],
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
  let margin = 1;
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
}

positionHexagons();

window.addEventListener("resize", positionHexagons);
