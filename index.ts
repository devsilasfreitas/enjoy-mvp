import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
const DOMParser = new JSDOM().window.DOMParser;
import { writeFileSync } from 'fs';
import { getCompanyRevenue } from './econodata';

interface Company {
    name: string;
    cnpj: string;
}
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page

const citysCoordenates = {
    'vitoria': '@-20.3085522,-40.3149001,15.22z',
}

async function getCompanies (coordenates?: string) {
    const searchs = [
        'farmacia',
        'restaurante',
        'petshop',
        'barbearia',
        'salao de beleza',
        'loja de roupas',
    ];

    return await Promise.all(searchs.map(async search => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Navigate the page to a URL.
        const url = `https://www.google.com/maps/search/${search}/${coordenates}`;
        await page.goto(url);
        await page.setViewport({width: 1366, height: 10000});
        const response = await page.waitForSelector('html', { timeout: 120000 });
        const html = await response?.evaluate(node => {
            const feed = [...node.querySelectorAll('div')].find(el => el.getAttribute('role') === 'feed');
            feed?.scrollBy(0, 1000);
            return node.innerHTML;
        }, { timeout: 60000});
        if (!html) {
            throw new Error('No html found');
        }
        const containerResponse = await page.waitForSelector('div[role="feed"]');
        const container = await containerResponse?.evaluate(node => {
            return node.innerHTML;
        });

        if (!container) {
            throw new Error('No html found');
        }

        const doc = new DOMParser().parseFromString(container || '', 'text/html');
        const companies: Company[] = [];
        const companiesContainer = Array.from(doc.querySelectorAll('.hfpxzc'))
        for (let i = 0; companies.length < 8 && i < companiesContainer.length; i += 2) {
            const company: {name: string, neighborhood: string | null, cnpj: string, phone: string | null, revenue: number | null} = {
                name: '',
                neighborhood: null,
                cnpj: '',
                phone: null,
                revenue: null
            };
            try {
                const companyContainer = companiesContainer[i];
                const name = companyContainer.ariaLabel;
                if (!name) {
                    continue;
                }

                company.name = name;

                await page.click(`a[aria-label="${name}"]`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const companyHtmlSelector = await page.waitForSelector('div[class="k7jAl miFGmb lJ3Kh "]', { timeout: 120000 });
                const companyHtml = await companyHtmlSelector?.evaluate(node => {
                    return node.innerHTML;
                });
    
                const companyDoc = new DOMParser().parseFromString(companyHtml || '', 'text/html');
                const companyAddress = companyDoc.querySelector('button[data-tooltip="Copiar endereço"]')?.getAttribute('aria-label')?.split(': ')[1] || null;
                const companyNeighborhood = companyAddress?.split('-')[companyAddress.split('-').length - 3]?.trim().split(',')[0] ?? null;

                company.neighborhood = companyNeighborhood;
    
                const phone = companyDoc.querySelector('button[data-tooltip="Copiar número de telefone"]')?.getAttribute('aria-label')?.split(': ')[1] || null;

                company.phone = phone;
    
                console.log(`https://www.google.com/search?q=cnpj+${name
                        .replace(/\s/g, '+')}`)
                const searchCnpjDoc = new DOMParser()
                    .parseFromString(await fetch(`https://www.google.com/search?q=cnpj+${name
                        .replace(/\s/g, '+')}+Espirito+Santo`)
                    .then(res => {
                        return res.text();
                    }), 'text/html');
    
                const cnpj = (searchCnpjDoc.querySelector('body')?.innerHTML
                ?.match(/\d{2}\.\d{3}\.\d{3}\/0001-\d{2}/)?.[0] || searchCnpjDoc.querySelector('body')?.innerHTML
                ?.match(/\d{8}0001\d{2}/)?.[0])?.replace(/[-\.\/]+/g, '') ?? null;
                    
    
                if (!cnpj) {
                    console.log('CNPJ not found for', name);
                    continue;
                }

                company.cnpj = cnpj;
    
                const revenue = await getCompanyRevenue(cnpj);

                if (!revenue) {
                    console.log('Revenue not found for', name);
                    continue;
                }

                company.revenue = revenue;
    
                companies.push(company);
            } catch (err) {
                continue;
            }
        }
        return companies;
    })).then(companies => {
        return companies.flat();
    });
}

getCompanies(citysCoordenates['vitoria']).then(companies => writeFileSync('companies.json', JSON.stringify(companies, null, 4)));