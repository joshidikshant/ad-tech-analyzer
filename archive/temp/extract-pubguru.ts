import { exec } from 'child_process';
import * as path from 'path';

async function downloadPubGuru() {
  const extensionId = 'nnoilpdinmjmdfpkdkbbkajejflbkoma';
  const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
  const outputDir = path.resolve(process.cwd(), 'pubguru-ext');
  const crxPath = path.resolve(process.cwd(), 'pubguru.crx');

  console.log(`Downloading PubGuru Ad Inspector (${extensionId})...`);
  
  const cmd = `curl -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${downloadUrl}" -o "${crxPath}"`;
  
  await new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });

  console.log('Download complete. Unzipping...');

  await new Promise((resolve) => {
    exec(`mkdir -p "${outputDir}" && unzip -q "${crxPath}" -d "${outputDir}" || true`, (err) => {
      console.log('Unzipped to:', outputDir);
      resolve(null);
    });
  });
}

downloadPubGuru();
