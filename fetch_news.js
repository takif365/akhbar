import fs from 'fs';
import path from 'path';

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAndRewriteNews() {
    try {
        console.log("=== Starting news fetching process ===");
        let selectedArticle = null;

        // 1. Try Currents API
        try {
            console.log("-> Searching in Currents API...");
            const cuUrl = `https://api.currentsapi.services/v1/latest-news?language=en&apiKey=${CURRENTS_API_KEY}`;
            const cuRes = await fetch(cuUrl);
            const cuData = await cuRes.json();
            
            if (cuData.status === "ok" && cuData.news && cuData.news.length > 0) {
                console.log(`Found ${cuData.news.length} articles in Currents. Filtering...`);
                for (const article of cuData.news) {
                    if (article.image && typeof article.image === 'string' && article.image !== 'None' && article.image.trim() !== '') {
                        selectedArticle = {
                            title: article.title,
                            content: article.description || article.title,
                            image: article.image,
                            pubDate: article.published,
                            source: "Currents"
                        };
                        console.log("Selected article from Currents:", selectedArticle.title);
                        break;
                    }
                }
            } else {
                console.log("Currents API returned no articles.");
            }
        } catch (e) {
            console.error("Error connecting to Currents:", e.message);
        }

        // 2. Try NewsData API as Fallback
        if (!selectedArticle) {
            try {
                console.log("-> Searching in NewsData API as fallback...");
                const ndUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&language=ar&image=1`;
                const ndRes = await fetch(ndUrl);
                const ndData = await ndRes.json();
                
                if (ndData.status === "success" && ndData.results && ndData.results.length > 0) {
                    for (const article of ndData.results) {
                        if (article.image_url && typeof article.image_url === 'string' && article.image_url.trim() !== '') {
                            selectedArticle = {
                                title: article.title,
                                content: article.description || article.content || article.title,
                                image: article.image_url,
                                pubDate: article.pubDate,
                                source: "NewsData"
                            };
                            console.log("Selected article from NewsData:", selectedArticle.title);
                            break;
                        }
                    }
                } else {
                    console.log("NewsData API returned no articles.");
                }
            } catch (e) {
                console.error("Error connecting to NewsData:", e.message);
            }
        }

        // Exit if no article with image is found
        if (!selectedArticle) {
            console.log("Script stopped: No article with image found in both sources.");
            return;
        }

        console.log(`=== Sending to AI (Source: ${selectedArticle.source}) ===`);
        const originalTitle = selectedArticle.title;
        const originalContent = selectedArticle.content;
        const rawImageUrl = selectedArticle.image;

        // IMAGE PROXY TO BYPASS HOTLINK PROTECTION (سلاح كسر حماية الصور)
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
6. Categorize the article by selecting exactly ONE or TWO tags ONLY from this strict list: ["سياسة", "اقتصاد", "رياضة", "تكنولوجيا", "صحة", "علوم", "منوعات"]. Do not create or use any tags outside this list.
7. CRITICAL: Do NOT write or include any Markdown image syntax (like ![alt](url)) or HTML image tags inside your content. Text ONLY.
8. CRITICAL RULE: The entire article MUST be strictly in Arabic ONLY. DO NOT include ANY English words, Latin characters, foreign letters, or weird symbols. You MUST transliterate all brand names, companies, and acronyms into Arabic (e.g., write "شي إن" instead of "Shein", "ناسكار" instead of "NASCAR").

Provide the response in JSON format only inside { } brackets like this:
{"title": "New Title in Arabic", "content": "Arabic Content here", "tags": ["tag1", "tag2"]}`;

        // الموديل الصحيح والأسرع لجوجل
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

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const geminiData = await geminiRes.json();

        if (!geminiData.candidates || geminiData.candidates.length === 0) {
            console.log("Script stopped: Gemini rejected or returned empty.", JSON.stringify(geminiData).substring(0, 200));
            return;
        }

        console.log("Gemini responded successfully. Extracting text...");
        const responseText = geminiData.candidates[0].content.parts[0].text;
        
        let rewritten;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.log("Script stopped: Gemini response is not valid JSON.", responseText);
                return;
            }
            rewritten = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
            console.log("Script stopped: Failed to parse JSON.", jsonError.message);
            return;
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

        let mdContent = `---
title: "${cleanTitle}"
author: "فريق التحرير"
pubDatetime: ${publishDate.toISOString()}
description: "${cleanDescription}"
ogImage: "${proxiedImageUrl}"
tags:
${tagsList}---

![صورة الخبر](${proxiedImageUrl})

${cleanContent}

*المصدر: وكالات*
`;
        
        const folderPath = path.join(process.cwd(), 'src', 'content', 'posts');
        if (!fs.existsSync(folderPath)){
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filePath = path.join(folderPath, fileName);
        
        fs.writeFileSync(filePath, mdContent);
        console.log(`Process completed successfully! Saved: ${fileName}`);
        
    } catch (error) {
        console.error("Critical error:", error.message);
        process.exit(1);
    }
}

fetchAndRewriteNews();
