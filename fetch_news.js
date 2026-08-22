import fs from 'fs';
import path from 'path';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAndRewriteNews() {
    try {
        const newsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=ar&max=5&apikey=${NEWS_API_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsData = await newsRes.json();

        if (!newsData.articles || newsData.articles.length === 0) {
            process.exit(0);
        }

        let selectedArticle = null;
        for (const article of newsData.articles) {
            if (article.image && typeof article.image === 'string' && article.image.trim() !== '') {
                selectedArticle = article;
                break;
            }
        }

        if (!selectedArticle) {
            process.exit(0);
        }

        const originalTitle = selectedArticle.title;
        const originalContent = selectedArticle.description || selectedArticle.content;
        const imageUrl = selectedArticle.image;

        const prompt = `Act as a professional journalist. Rewrite this news professionally and neutrally in Arabic.
News:
Title: ${originalTitle}
Details: ${originalContent}

Requirements:
1. New attractive title.
2. Write a comprehensive news article of at least 3 long paragraphs.
3. Paragraph 1: Main event summary.
4. Paragraph 2: Available details and information.
5. Paragraph 3: Event background, importance, and expected impacts.

Provide the response in JSON format only inside { } brackets like this:
{"title": "New Title", "content": "Content here"}`;

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

        const publishDate = new Date();
        const slug = rewritten.title.replace(/\s+/g, '-').replace(/[^\w\-\u0600-\u06FF]/g, '').substring(0, 40);
        const fileName = `${publishDate.getTime()}-${slug}.md`;
        
        const cleanTitle = rewritten.title.replace(/"/g, "'");
        const cleanDescription = rewritten.content.substring(0, 100).replace(/"/g, "'") + "...";

        let mdContent = `---
title: "${cleanTitle}"
author: "Editorial Team"
pubDatetime: ${publishDate.toISOString()}
description: "${cleanDescription}"
ogImage: "${imageUrl}"
tags:
  - "News"
---

![News Image](${imageUrl})

${rewritten.content}

*Source: Agencies*
`;
        
        const folderPath = path.join(process.cwd(), 'src', 'content', 'posts');
        if (!fs.existsSync(folderPath)){
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const filePath = path.join(folderPath, fileName);
        
        fs.writeFileSync(filePath, mdContent);
        
    } catch (error) {
        process.exit(1);
    }
}

fetchAndRewriteNews();
