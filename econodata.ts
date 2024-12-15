import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
const DOMParser = new JSDOM().window.DOMParser;

export async function getCompanyRevenue(cnpj: string) {

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        browser.setCookie({
            name: 'ecdt_token_site',
            value: 'Bearer+eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjZF9jbGllbnRlIjoiREVWRUNPTk9EQVRBLTIwMTkwMTMwIiwiaWRfdXN1YXJpbyI6Ijg5MDk5MCIsImlhdCI6MTczNDI3NDIwOH0.QRUSMMQJW80I4YH7E0ibYtZxdOGrW80oZW7-TJVSckE',
            domain: '.econodata.com.br',
            expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
            httpOnly: false,
            path: '/',
            secure: false,
            session: false,
            size: 1,
        })
    
        await page.goto(`https://www.econodata.com.br/consulta-empresa/${cnpj}`);	
    
        await new Promise(resolve => setTimeout(resolve, 5000));
        let html = await page.content();
    
        let doc = new DOMParser().parseFromString(html, 'text/html');
    
        if (doc.querySelector('#detalhe_empresa_faturamento_anual button[class="cursor-pointer flex items-end"]')) {
            await page.click('#detalhe_empresa_faturamento_anual button');
            await new Promise(resolve => setTimeout(resolve, 5000));
            html = await page.content();
            doc = new DOMParser().parseFromString(html, 'text/html');
            if (doc.querySelector('a[aria-label="dismiss cookie message"]')) {
                await page.click('a[aria-label="dismiss cookie message"]');
                console.log('cookie message dismissed');
                await page.click('#detalhe_empresa_faturamento_anual button');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            html = await page.content();
            doc = new DOMParser().parseFromString(html, 'text/html');
            if (!doc.querySelector('button[class="flex-1 p-3 text-white bg-ecdt-azul-500 rounded-md text-sm font-bold disabled:opacity-80 disabled:cursor-not-allowed"]')) {
                return null;
            }
            html = await page.content();
            doc = new DOMParser().parseFromString(html, 'text/html');
            if (!doc.querySelector('button[class="flex-1 p-3 text-white bg-ecdt-azul-500 rounded-md text-sm font-bold disabled:opacity-80 disabled:cursor-not-allowed"]')) {
                return null;
            }
            await page.click('button[class="flex-1 p-3 text-white bg-ecdt-azul-500 rounded-md text-sm font-bold disabled:opacity-80 disabled:cursor-not-allowed"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            html = await page.content();
            doc = new DOMParser().parseFromString(html, 'text/html');
            if (!doc.querySelector('button[class="flex-1 p-3 rounded-md text-sm font-bold border border-ecdt-azul-500 text-ecdt-azul-500"]')) {
                return null;
            }
            await page.click('button[class="flex-1 p-3 rounded-md text-sm font-bold border border-ecdt-azul-500 text-ecdt-azul-500"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.reload();
            await new Promise(resolve => setTimeout(resolve, 5000));
            html = await page.content();
            doc = new DOMParser().parseFromString(html, 'text/html');
        }
    
        const yearlyRevenueText = doc.querySelector('#detalhe_empresa_faturamento_anual div[class="text-ecdt-cinza-20"]')?.textContent;
    
        const yearlyRevenue = yearlyRevenueText === 'Desconhecido' ? 'Desconhecido' : yearlyRevenueText
            ?.replace(/\\n/g, '')
            .replace(/\s/g, '')
            .replace(/R\$/g, '')
            .split('a')
            .map((value) => {
                const number = value.trim() ?? '';
                return parseFloat(number.replace(',', '.')) * (number.endsWith('mil') ? 1000 : number.endsWith('milhão') ? 1000000 : number.endsWith('milhões') ? 1000000 : number.endsWith('bilhão') ? 1000000000 : number.endsWith('bilhões') ? 1000000000 : 1);
            });
        
        if (!yearlyRevenue) {
            return null;
        }
    
        if (typeof yearlyRevenue === 'string' || yearlyRevenue.find((value) => typeof value !== 'number')) {
            return null;
        }
    
        return yearlyRevenue.reduce((acc, value) => acc + value, 0) / 2;
    } catch (error) {
        return null;
    }


}