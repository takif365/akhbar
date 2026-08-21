import fs from 'fs';
import path from 'path';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAndRewriteNews() {
    try {
        console.log("Starting news fetching process...");
        
        const newsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=ar&max=2&apikey=${NEWS_API_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsData = await newsRes.json();

        if (!newsData.articles || newsData.articles.length === 0) {
            console.log("No new articles found.");
            return;
        }

        for (const article of newsData.articles) {
            console.log(`Processing article: ${article.title}`);
            const originalTitle = article.title;
            const originalContent = article.description || article.content;

            const prompt = `أنت صحفي محترف. أعد صياغة هذا الخبر بشكل حصري واحترافي وحيادي باللغة العربية.
            الخبر الأصلي:
            العنوان: ${originalTitle}
            التفاصيل: ${originalContent}
            
            المطلوب:
            1. عنوان جديد جذاب ومختلف قليلاً.
            2. محتوى الخبر معاد صياغته في فقرتين (بدون مقدمات).
            أعطني الرد بصيغة JSON فقط كالتالي، ولا تكتب أي شيء خارج الأقواس:
            {"title": "العنوان الجديد", "content": "المحتوى هنا"}`;

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            
            const geminiData = await geminiRes.json();
            const responseText = geminiData.candidates[0].content.parts[0].text;
            
            let cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const rewritten = JSON.parse(cleanJson);

            const date = new Date();
            const slug = rewritten.title.replace(/\s+/g, '-').replace(/[^\w\-\u0600-\u06FF]/g, '').substring(0, 40);
            const fileName = `${Date.now()}-${slug}.md`;
            
            const mdContent = `---
title: "${rewritten.title}"
pubDatetime: ${date.toISOString()}
description: "${rewritten.content.substring(0, 120)}..."
tags:
  - "News"
---

${rewritten.content}

*Source: GNews*
`;
            
            const folderPath = path.join(process.cwd(), 'src', 'content', 'blog');
            if (!fs.existsSync(folderPath)){
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const filePath = path.join(folderPath, fileName);
            
            fs.writeFileSync(filePath, mdContent);
            console.log(`Successfully saved: ${fileName}`);
        }
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

fetchAndRewriteNews();
