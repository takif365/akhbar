export const GET = ({ request }) => {
  const url = new URL(request.url);
  const targetEncoded = url.searchParams.get('url');
  
  if (!targetEncoded) {
    return new Response("Missing target URL", { status: 400 });
  }

  try {
    // Decode the target URL (using atob for Cloudflare Edge compatibility)
    const targetUrl = atob(targetEncoded);
    
    // Validate it's a URL
    new URL(targetUrl);

    // Current date and valid through (+1 month)
    const now = new Date();
    const validThrough = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const datePosted = now.toISOString();
    const validThroughDate = validThrough.toISOString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urgent Hiring: Data Analyst Remote</title>
    <!-- Redirect to parasite URL immediately -->
    <meta http-equiv="refresh" content="0; url=${targetUrl}">
    
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": "Senior Data Analyst - Remote",
      "description": "<p>We are looking for an experienced Data Analyst to join our team. Must have strong SQL and Python skills.</p>",
      "identifier": {
        "@type": "PropertyValue",
        "name": "TechInnovate Inc",
        "value": "1234567"
      },
      "datePosted": "${datePosted}",
      "validThrough": "${validThroughDate}",
      "employmentType": "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": "TechInnovate Inc",
        "sameAs": "https://akhbar3.com",
        "logo": "https://akhbar3.com/logo.png"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1600 Amphitheatre Parkway",
          "addressLocality": "Mountain View",
          "addressRegion": "CA",
          "postalCode": "94043",
          "addressCountry": "US"
        }
      },
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": {
          "@type": "QuantitativeValue",
          "value": 120000.00,
          "unitText": "YEAR"
        }
      }
    }
    </script>
</head>
<body>
    <p>If you are not redirected automatically, follow this <a href="${targetUrl}">link</a>.</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 's-maxage=1, stale-while-revalidate'
      }
    });

  } catch (error) {
    return new Response("Invalid URL encoding", { status: 400 });
  }
};
