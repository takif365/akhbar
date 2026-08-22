import fs from 'fs';
import path from 'path';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAndRewriteNews() {
    try {
        console.log("Starting news fetching process...");
        
        const newsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=ar&max=3&apikey=${NEWS_API_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsData = await newsRes.json();

        if (!newsData.articles || newsData.articles.length === 0) {
            console.log("No new articles found from GNews.");
            return;
        }

        for (const article of newsData.articles) {
            console.log(`\nProcessing article: ${article.title}`);
            const originalTitle = article.title;
            const originalContent = article.description || article.content;

            const prompt = `أنت صحفي محترف. أعد صياغة هذا الخبر بشكل حصري واحترافي وحيادي باللغة العربية.
            الخبر:
            العنوان: ${originalTitle}
            التفاصيل: ${originalContent}
            
            المطلوب:
            1. عنوان جديد جذاب ومختلف.
            2. محتوى الخبر معاد صياغته في مقال متكامل يتكون من 3 إلى 4 فقرات، مع إضافة فقرة توضح "خلفية الحدث" أو "أهمية هذا الخبر" لجعله مقالاً دقيقاً ومفيداً للقارئ.
            أعطني الرد بصيغة JSON فقط داخل الأقواس { } كالتالي:
            {"title": "العنوان الجديد", "content": "المحتوى هنا"}`;

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
                console.error("Gemini skipped this article.");
                continue; 
            }

            const responseText = geminiData.candidates[0].content.parts[0].text;
            
            let rewritten;
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error("No JSON structure found. Skipping...");
                    continue;
                }
                rewritten = JSON.parse(jsonMatch[0]);
            } catch (jsonError) {
                console.error("Failed to parse JSON. Skipping...");
                continue;
            }

            const date = new Date();
            const slug = rewritten.title.replace(/\s+/g, '-').replace(/[^\w\-\u0600-\u06FF]/g, '').substring(0, 40);
            const fileName = `${Date.now()}-${slug}.md`;
            
            const mdContent = `---
title: "${rewritten.title.replace(/"/g, "'")}"
author: "فريق التحرير"
pubDatetime: ${date.toISOString()}
description: "${rewritten.content.substring(0, 100).replace(/"/g, "'")}..."
tags:
  - "أخبار"
---

${rewritten.content}

*المصدر: وكالات*
`;
            
            const folderPath = path.join(process.cwd(), 'src', 'content', 'posts');
            if (!fs.existsSync(folderPath)){
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const filePath = path.join(folderPath, fileName);
            
            fs.writeFileSync(filePath, mdContent);
            console.log(`Successfully saved: ${fileName}`);
        }
    } catch (error) {
        console.error("Critical Error occurred:", error);
    }
}

fetchAndRewriteNews();
