import { NextResponse } from 'next/server';

const SWAGGER_CSS = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
const SWAGGER_JS_BUNDLE = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
const SWAGGER_JS_STANDALONE = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const specUrl = searchParams.get('spec') ?? '';

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Swagger UI</title>
    <link rel="stylesheet" href="${SWAGGER_CSS}" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
      }
      #swagger-ui {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_JS_BUNDLE}" crossorigin="anonymous"></script>
    <script src="${SWAGGER_JS_STANDALONE}" crossorigin="anonymous"></script>
    <script>
      window.addEventListener('load', function () {
        const specUrl = ${JSON.stringify(specUrl)};
        const ui = window.SwaggerUIBundle({
          url: specUrl || undefined,
          dom_id: '#swagger-ui',
          presets: [window.SwaggerUIBundle.presets.apis, window.SwaggerUIStandalonePreset],
          layout: 'StandaloneLayout',
        });
        window.ui = ui;
      });
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
