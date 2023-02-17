import {createReadStream, createWriteStream} from 'fs';
import readline from 'readline'
import { promisify } from 'util';
import puppeteer from 'puppeteer';

const inputFilePath = 'words.txt';
const outputFilePath = 'dictionary.txt';
const CHUNK_SIZE = Math.floor((1024 * 1024) / 2); // 500kb or 0.5MB chunk size

async function fetchData(word) {
  // const URI = " Whatever allowed public link/site u want to scrape ** Deleted mine bcoz of sensitive contents ** "
  try {
    const getInfo = async (url) => {
      const browser = await puppeteer.launch({
        headless: true, // will launch browser in headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.goto(url, {waitUntil: 'domcontentloaded'});

      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      const info = await page.evaluate(() => {
        /* fetching site content logic will go here
        this whole content fetching logic should be replace with whatever you want to fetch from whatever site you prefer
        ------------------------------------------------------------------------------------------------ */
        const defination = document.querySelector('.definitions-group');
        if (defination) {
          return Array.from(defination.querySelectorAll('.definition-cluster') || '').map(element => {
            const mainLine = element.querySelector('.relative');
            return mainLine.querySelector('.text-base').innerText;
          });
        }
        return [];
        // -------------------------------------------------------------------------------------------------
      });

      await browser.close(); // neccesary to close the browser
      return info;
    };

    return await getInfo(URI);
  } catch (err) {
    console.log(err);
    return [];
  }
}

async function processChunk(chunk) {
  const lines = chunk.toString().split('\n'); // fetch words from each chunk 
  const promises = lines.map(line => fetchData(line.trim()));
  const results = await Promise.all(promises);
  const collection = {};
  for (let i = 0; i < results.length; i++) {
    collection[lines[i].trim()] = results[i];
  }
  return collection;
}

async function read() {
  const fileStream = createReadStream(inputFilePath, { highWaterMark: CHUNK_SIZE });
  const rl = readline.createInterface({  // for reading each chunk of data line by line
    input: fileStream,
    crlfDelay: Infinity
  });

  const writeStream = createWriteStream(outputFilePath);
  writeStream.write('{');

  let isFirstChunk = true;
  for await (const chunk of rl) {
    const collection = await processChunk(chunk);
    if (isFirstChunk) {
      isFirstChunk = false;
    } else {
      writeStream.write(',');
    }
    writeStream.write(JSON.stringify(collection));
  }

  writeStream.write('}');
  writeStream.end();

  await promisify(writeStream.on).call(writeStream, 'finish');
  console.log('Done writing to file!');
}

read();
