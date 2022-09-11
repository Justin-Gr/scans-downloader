import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

export class ExtractManager {

	constructor(downloadPath, outputPath) {
		this.downloadPath = downloadPath;
		this.outputPath = outputPath;
	}

	fetchZipFiles() {
		return fs.readdirSync(this.downloadPath).filter(file => {
			return path.extname(file).toLowerCase() === '.zip';
		});
	}

	async extractZipFiles(cleanZips = true, compileToPdf = true) {
		const zipFiles = this.fetchZipFiles();

		for (let zipFile of zipFiles) {
			const zip = new AdmZip(`${this.downloadPath}/${zipFile}`, {});
			const chapterDir = path.parse(zipFile).name;

			console.log(`\n==========${chapterDir}==========`);
			console.log('Extraction en cours...');

			zip.extractAllTo(`${this.outputPath}/${chapterDir}`, false, false, '');
			if (cleanZips) {
				fs.unlinkSync(`${this.downloadPath}/${zipFile}`);
			}

			console.log('Fichiers extraits');

			if (compileToPdf) {
				console.log('Génération du PDF...');
				await this.generatePdf(chapterDir);
			}
		}
	}

	fetchChapterPages(chapterPath) {
		return fs.readdirSync(chapterPath).filter((image, _, images) => {
			const imageName = path.parse(image).name;
			return !images.includes(`${imageName} - Colo.png`);
		}).sort((a, b) => {
			const aNum = Number.parseInt(a.split(/[ .]/)[1]);
			const bNum = Number.parseInt(b.split(/[ .]/)[1]);
			return aNum - bNum;
		});
	}

	async generatePdfImage(pdfDoc, chapterPath, chapterPage) {
		const imageBuffer = fs.readFileSync(`${chapterPath}/${chapterPage}`);
		const [imageJpg, imagePng] = await Promise.allSettled([
			pdfDoc.embedJpg(imageBuffer),
			pdfDoc.embedPng(imageBuffer)
		]);

		if (imageJpg.status === 'rejected' && imagePng.status === 'rejected') {
			console.error(`Impossible de convertir la page ${chapterPage.split(/[ .]/)[1]}, elle sera manquante :(`);
			return null;
		}

		return imageJpg.status === 'fulfilled' ? imageJpg .value: imagePng.value;
	}

	async generatePdf(chapterDir) {
		const chapterPath = `${this.outputPath}/${chapterDir}`;
		const chapterPages = this.fetchChapterPages(chapterPath);

		const pdfDoc = await PDFDocument.create();

		for (let chapterPage of chapterPages) {
			const page = pdfDoc.addPage();
			const image = await this.generatePdfImage(pdfDoc, chapterPath, chapterPage);

			if (image) {
				page.drawImage(image, {
					x: 0,
					y: 0,
					width: page.getWidth(),
					height: page.getHeight()
				});
			}
		}

		const pdfBytes = await pdfDoc.save();
		fs.appendFileSync(`${this.outputPath}/${chapterDir}.pdf`, Buffer.from(pdfBytes));
		fs.rmSync(`${chapterPath}`, { recursive: true, force: true });
		console.log('PDF généré');
	}
}
