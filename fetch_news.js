import fs from 'fs';
import path from 'path';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAndRewriteNews() {
    try {
        console.log("Starting news fetching process...");
        
        // جلب 3 مقالات
        const newsUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=ar&max=3&apikey=${NEWS_API_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsData = await newsRes.json();

        if (!newsData.articles || newsData.articles.length === 0) {
            console.log("No new articles found from GNews.");
            return;
        }

        // تحديد وقت الأساس (الوقت الحالي الذي بدأ فيه السكربت)
        let baseTime = Date.now();

        for (let i = 0; i < newsData.articles.length; i++) {
            const article = newsData.articles[i];
            console.log(`\nProcessing article ${i + 1}: ${article.title}`);
            const originalTitle = article.title;
            const originalContent = article.description || article.content;
            
            // استخراج رابط الصورة (إن وجد)
            const imageUrl = article.image ? article.image : "";

            // Prompt محسن لمقال طويل واحترافي
            const prompt = `أنت صحفي محترف. أعد صياغة هذا الخبر بشكل حصري واحترافي وحيادي باللغة العربية.
            الخبر:
            العنوان: ${originalTitle}
            التفاصيل: ${originalContent}
            
            المطلوب:
            1. عنوان جديد جذاب ومختلف.
            2. اكتب مقالاً إخبارياً متكاملاً لا يقل عن 3 فقرات طويلة.
            3. الفقرة الأولى: ملخص للحدث الرئيسي.
            4. الفقرة الثانية: التفاصيل والمعلومات المتوفرة.
            5. الفقرة الثالثة: خلفية الحدث أو أهميته وتأثيراته المتوقعة.
            
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

            // *** حل معادلة الوقت المتباين ***
            // إنقاص وقت عشوائي (بين 5 إلى 25 دقيقة) من وقت المقال السابق
            // هذا يجعل المقال الأول أحدث، والثاني أقدم بقليل، والثالث أقدم أكثر
            const randomOffsetMinutes = Math.floor(Math.random() * (25 - 5 + 1) + 5);
            baseTime = baseTime - (randomOffsetMinutes * 60 * 1000);
            const publishDate = new Date(baseTime);

            const slug = rewritten.title.replace(/\s+/g, '-').replace(/[^\w\-\u0600-\u06FF]/g, '').substring(0, 40);
            const fileName = `${publishDate.getTime()}-${slug}.md`;
            
            // إضافة حقل author والصورة (ogImage) إلى الـ Frontmatter
            let mdContent = `---
title: "${rewritten.title.replace(/"/g, "'")}"
author: "فريق التحرير"
pubDatetime: ${publishDate.toISOString()}
description: "${rewritten.content.substring(0, 100).replace(/"/g, "'")}..."
`;
            
            if (imageUrl) {
                mdContent += `ogImage: "${imageUrl}"\n`;
            }

            mdContent += `tags:
  - "أخبار"
---

${imageUrl ? `![صورة الخبر](${imageUrl})\n\n` : ''}

${rewritten.content}

*المصدر: وكالات*
`;
            
            const folderPath = path.join(process.cwd(), 'src', 'content', 'posts');
            if (!fs.existsSync(folderPath)){
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const filePath = path.join(folderPath, fileName);
            
            fs.writeFileSync(filePath, mdContent);
            console.log(`Successfully saved: ${fileName} with date: ${publishDate.toISOString()}`);
        }
    } catch (error) {
        console.error("Critical Error occurred:", error);
    }
}

fetchAndRewriteNews();
