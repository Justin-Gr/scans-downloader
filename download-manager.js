import * as puppeteer from 'puppeteer';

export class DownloadManager {

	constructor(uri, firstChapter, lastChapter, downloadPath, endCallback) {
		this.uri = uri;
		this.currentChapter = firstChapter;
		this.lastChapter = lastChapter;
		this.downloadPath = downloadPath;
		this.endCallback = endCallback;
	}

	async initializeSession() {
		this.browser = await puppeteer.launch({
			headless: true
		});

		this.page = await this.browser.newPage();

		const client = await this.browser.target().createCDPSession();
		await client.send('Browser.setDownloadBehavior', {
			behavior: 'allow',
			downloadPath: this.downloadPath,
			eventsEnabled: true
		});
		client.on('Browser.downloadProgress', this.onDownloadProgress.bind(this));
	}

	async startDownload() {
		await this.downloadCurrentChapter();
	}

	async endSession() {
		await this.page.close();
		await this.browser.close();
	}

	async onDownloadProgress(event) {
		// console.log(`Progression : ${100 * event.receivedBytes / event.totalBytes}%`);
		if (event.state === 'completed') {
			console.log('Scan téléchargé');
			await this.downloadNextChapter();
		}
	}

	async downloadNextChapter() {
		if (this.currentChapter < this.lastChapter) {
			this.currentChapter += 1;
			await this.downloadCurrentChapter();
		} else {
			await this.endCallback();
		}
	}

	async downloadCurrentChapter() {
		console.log(`\n==========SCAN N°${this.currentChapter}==========`);
		console.log('Chargement de la page...');

		const response = await this.page.goto(`${this.uri}/${this.currentChapter}/1`, {
			waitUntil: 'networkidle2'
		});

		if (!response.ok()) {
			console.error('Ce scan semble indisponible');
			await this.downloadNextChapter();
			return;
		}

		console.log(`Page chargée, chargement du scan n°${this.currentChapter}...`);

		try {
			await this.page.waitForFunction(
				() => !document.querySelector('[data-server-rendered]'),
				{ timeout: 60_000 }
			);
		} catch (ex) {
			console.error('Délai d\'attente expiré');
			await this.downloadNextChapter();
			return;
		}

		console.log(`Scan n°${this.currentChapter} chargé, téléchargement en cours...`);

		await this.page.click('#page', {
			button: 'right'
		});
		await this.page.evaluate(() => {
			document.querySelector('div.context-menu-content-blur').children[1].click();
		});
	}
}
