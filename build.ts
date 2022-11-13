import shell from "shelljs";
import appConfig from "./app.json";
import fs from "fs/promises";
import { faker } from "@faker-js/faker";
import { https } from "follow-redirects";
import { createWriteStream } from "fs";
import path from "path";
import sharp from "sharp";

function generateImages(amount: number = 5) {
  return Array.from({ length: amount }, () => faker.image.cats());
}

async function processImage(url: string, imagePath: string, thumbPath: string) {
  const imageStream = createWriteStream(imagePath);

  const thumbStream = createWriteStream(thumbPath);

  https.get(url, (request) => {
    request.pipe(imageStream);

    const sharpInstance = sharp();

    sharpInstance
      .resize(200, 200, {
        fit: sharp.fit.cover,
      })
      .pipe(thumbStream);

    imageStream.on("finish", () => {
      imageStream.close();
    });

    thumbStream.on("finish", () => {
      thumbStream.close();
    });

    request.pipe(sharpInstance);
  });
}

(async function build() {
  console.log("Starting build process");
  shell.rm("-rf", "public");
  shell.mkdir("public");
  shell.mkdir(path.join("public", "images"));
  shell.mkdir(path.join("public", "thumbImages"));

  console.log("Downloading images...");
  const imagesUrls = generateImages(10);
  await Promise.all(
    imagesUrls.map((imagesUrl, index) =>
      processImage(
        imagesUrl,
        path.join("public", "images", `${index}.jpg`),
        path.join("public", "thumbImages", `${index}.jpg`)
      )
    )
  );

  const imagesContent = imagesUrls
    .map(
      (_, index) => `
  <a href="/Jamstack_Gatsby_elitonjr/images/${index}.jpg">
    <img src="/Jamstack_Gatsby_elitonjr/thumbImages/${index}.jpg">
  </a>
  `
    )
    .join("");

  const imagesGrid = `
        <div class="images-grid">
            ${imagesContent}
        </div>
  `;

  const htmlFile = (await fs.readFile("index.html"))
    .toString()
    .replace("$TITLE", appConfig.title)
    .replace("$DESCRIPTION", appConfig.description)
    .replace("$CONTENT", imagesGrid);

  await fs.writeFile("public/index.html", htmlFile);

  console.log("Sucess");
})();
