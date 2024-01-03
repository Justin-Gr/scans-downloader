import * as child_process from 'child_process';
import { DownloadManager } from './download-manager.js';
import { ExtractManager } from './extract-manager.js';
import * as path from 'path';
import promptSync from 'prompt-sync';
const prompt = promptSync({});

const URL = 'https://littlexgarden.com';
const MANGA = 'one-piece';

const DOWNLOAD_PATH = path.resolve('./downloads');
const OUTPUT_PATH = path.resolve('./outputs');

const CLEAN_ZIPS = true;
const COMPILE_TO_PDF = true;

const main = async () => {
	console.log(' __                               _                     _                 _           \n' +
		'/ _\\ ___ __ _ _ __  ___        __| | _____      ___ __ | | ___   __ _  __| | ___ _ __ \n' +
		'\\ \\ / __/ _` | \'_ \\/ __|_____ / _` |/ _ \\ \\ /\\ / / \'_ \\| |/ _ \\ / _` |/ _` |/ _ \\ \'__|\n' +
		'_\\ \\ (_| (_| | | | \\__ \\_____| (_| | (_) \\ V  V /| | | | | (_) | (_| | (_| |  __/ |   \n' +
		'\\__/\\___\\__,_|_| |_|___/      \\__,_|\\___/ \\_/\\_/ |_| |_|_|\\___/ \\__,_|\\__,_|\\___|_|   \n');

	console.log('Utilitaire de téléchargement de scans Little Garden (https://littlexgarden.com)\n');

	console.log(`Manga paramétré : ${MANGA}\n`);

	let firstChapter, lastChapter;
	try {
		firstChapter = Number.parseInt(prompt('Numéro du premier chapitre à télécharger : ', '', {}));
		lastChapter = Number.parseInt(prompt('Numéro du dernier chapitre à télécharger : ', '', {}));
	} catch (ex) {
		process.exit();
	}

	if (!firstChapter || !lastChapter) {
		process.exit();
	}

	const uri = `${URL}/${MANGA}`;
	const downloadManager = new DownloadManager(uri, firstChapter, lastChapter, DOWNLOAD_PATH, async () => {
		await downloadManager.endSession();

		console.log('\nFin du téléchargement, extraction des fichiers ZIP...');
		const extractManager = new ExtractManager(DOWNLOAD_PATH, OUTPUT_PATH);
		await extractManager.extractZipFiles(CLEAN_ZIPS, COMPILE_TO_PDF);

		console.log('\nFinito pipo !');
		child_process.exec(`start "" "${OUTPUT_PATH}"`);
	});

	await downloadManager.initializeSession();
	await downloadManager.startDownload();
}

await main();
