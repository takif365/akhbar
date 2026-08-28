import fs from 'fs';
import path from 'path';

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const historyPath = path.join(process.cwd(), 'history.json');
let publishedHistory = [];

if (fs.existsSync(historyPath)) {
    try {
        publishedHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {
        publishedHistory = [];
    }
}

async function validateImageUrl(url) {
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(3000)
        });
        return response.ok && response.headers.get('content-type')?.startsWith('image/');
    } catch (error) {
        return false;
    }
}

async function fetchAndRewriteNews() {
    try {
        let selectedArticle = null;

        try {
            const cuUrl = `https://api.currentsapi.services/v1/latest-news?language=en`;
            const cuRes = await fetch(cuUrl, {
                headers: { 'Authorization': `Bearer ${CURRENTS_API_KEY}` }
            });
            const cuData = await cuRes.json();
            
            if (cuData.status === "ok" && cuData.news && cuData.news.length > 0) {
                const shuffledCurrents = cuData.news.sort(() => 0.5 - Math.random());
                for (const article of shuffledCurrents) {
                    if (publishedHistory.includes(article.title)) {
                        continue;
                    }
                    if (article.image && typeof article.image === 'string' && article.image !== 'None' && article.image.trim() !== '') {
                        const isImageValid = await validateImageUrl(article.image);
                        if (isImageValid) {
                            selectedArticle = {
                                title: article.title,
                                content: article.description || article.title,
                                image: article.image,
                                pubDate: article.published,
                                source: "Currents"
                            };
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e.message);
        }

        if (!selectedArticle) {
            try {
                const ndUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&language=ar&image=1`;
                const ndRes = await fetch(ndUrl);
                const ndData = await ndRes.json();
                
                if (ndData.status === "success" && ndData.results && ndData.results.length > 0) {
                    const shuffledNewsData = ndData.results.sort(() => 0.5 - Math.random());
                    for (const article of shuffledNewsData) {
                        if (publishedHistory.includes(article.title)) {
                            continue;
                        }
                        if (article.image_url && typeof article.image_url === 'string' && article.image_url.trim() !== '') {
                            const isImageValid = await validateImageUrl(article.image_url);
                            if (isImageValid) {
                                selectedArticle = {
                                    title: article.title,
                                    content: article.description || article.content || article.title,
                                    image: article.image_url,
                                    pubDate: article.pubDate,
                                    source: "NewsData"
                                };
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e.message);
            }
        }

        if (!selectedArticle) {
            process.exit(0);
        }

        const originalTitle = selectedArticle.title;
        const originalContent = selectedArticle.content;
        const rawImageUrl = selectedArticle.image;

        const proxiedImageUrl = `https://wsrv.nl/?url=${encodeURIComponent(rawImageUrl)}`;

        const prompt = `Act as a professional journalist. Translate and rewrite this news professionally and neutrally in Arabic.
News:
Title: ${originalTitle}
Details: ${originalContent}

Requirements:
1. New attractive Arabic title.
2. Write a comprehensive news article of at least 3 long paragraphs in Arabic.
3. Paragraph 1: Main event summary.
4. Paragraph 2: Available details and information.
5. Paragraph 3: Event background, importance, and expected impacts.
6. Categorize the article by selecting exactly ONE or TWO tags ONLY from this strict list: ["سياسة", "اقتصاد", "رياضة", "تكنولوجيا", "برمجة", "علوم", "صحة", "فن وترفيه", "أسلوب حياة", "طبخ وغذاء", "أخبار محلية", "عالمية", "منوعات"]. Do not create or use any tags outside this list.
7. CRITICAL: Do NOT write or include any Markdown image syntax (like ![alt](url)) or HTML image tags inside your content. Text ONLY.
8. CRITICAL RULE: The entire article MUST be strictly in Arabic ONLY. DO NOT include ANY English words, Latin characters, foreign letters, or weird symbols. You MUST transliterate all brand names, companies, and acronyms into Arabic (e.g., write "شي إن" instead of "Shein", "ناسكار" instead of "NASCAR").

Provide the response in JSON format only inside { } brackets like this:
{"title": "New Title in Arabic", "content": "Arabic Content here", "tags": ["tag1", "tag2"]}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        let geminiData = null;
        let maxRetries = 3;
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
            attempt++;
            
            try {
                const geminiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                geminiData = await geminiRes.json();

                if (geminiData.error) {
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                } else if (geminiData.candidates && geminiData.candidates.length > 0) {
                    success = true;
                } else {
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
            } catch (err) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 60000));
                }
            }
        }

        if (!success || !geminiData || !geminiData.candidates) {
            process.exit(0);
        }

        const responseText = geminiData.candidates[0].content.parts[0].text;
        
        let rewritten;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                process.exit(0);
            }
            rewritten = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
            process.exit(0);
        }

        const cleanContent = rewritten.content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
        const publishDate = selectedArticle.pubDate ? new Date(selectedArticle.pubDate) : new Date();
        const slug = rewritten.title.replace(/\s+/g, '-').replace(/[^\w\-\u0600-\u06FF]/g, '').substring(0, 40);
        const fileName = `${publishDate.getTime()}-${slug}.md`;
        
        const cleanTitle = rewritten.title.replace(/"/g, "'");
        const cleanDescription = cleanContent.substring(0, 100).replace(/"/g, "'") + "...";

        let tagsList = '';
        if (rewritten.tags && Array.isArray(rewritten.tags) && rewritten.tags.length > 0) {
            rewritten.tags.forEach(tag => {
                tagsList += `  - "${tag.replace(/"/g, "'")}"\n`;
            });
        } else {
             tagsList = '  - "أخبار"\n'; 
        }

        const safeRawImage = rawImageUrl.replace(/'/g, "%27");
        const fallbackImage = "https://placehold.co/800x400/212737/fdfdfd.png?text=Akhbar+3";

        let mdContent = `---
title: "${cleanTitle}"
author: "فريق التحرير"
pubDatetime: ${publishDate.toISOString()}
description: "${cleanDescription}"
ogImage: "${safeRawImage}"
tags:
${tagsList}---

<img src="${proxiedImageUrl}" alt="${cleanTitle}" onerror="if (this.src !== '${safeRawImage}') { this.src = '${safeRawImage}'; } else { this.src = '${fallbackImage}'; }" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" />

${cleanContent}

*المصدر: وكالات*
`;
        
        const folderPath = path.join(process.cwd(), 'src', 'content', 'posts');
        if (!fs.existsSync(folderPath)){
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filePath = path.join(folderPath, fileName);
        
        fs.writeFileSync(filePath, mdContent);
        
        publishedHistory.push(originalTitle);
        if (publishedHistory.length > 1000) {
            publishedHistory = publishedHistory.slice(-1000);
        }
        
        fs.writeFileSync(historyPath, JSON.stringify(publishedHistory, null, 2));
        
    } catch (error) {
        process.exit(1);
    }
}

fetchAndRewriteNews();
