import { Hono } from "hono";
type CloudflareBindings = { AI: Ai };

const app = new Hono<{ Bindings: CloudflareBindings }>();
app.get('/', (c) => {
  return c.redirect('/image-preview'); // ¡Redirección aquí!
});
// Endpoint para descargar imagen
app.get("/image", async (c) => {
  const prompt: string =
    c.req.query("prompt") ?? "a sunset over the ocean in a futuristic city";

  const result = await c.env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
    prompt,
  });

  const base64Image = result.image;
  if (typeof base64Image !== "string") {
    return c.text("Image generation failed or returned unexpected result", 500);
  }

  const imageBuffer = Uint8Array.from(atob(base64Image), (c) =>
    c.charCodeAt(0)
  );

  return new Response(imageBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": "attachment; filename=flux-image.png",
    },
  });
});

// Endpoint para vista previa en HTML
app.get("/image-preview", async (c) => {
  const basePrompt: string | null = c.req.query("prompt");
  let imageTags = "";

  if (basePrompt) {
    const promptVariants = [
      `${basePrompt} in digital art style`,
      `${basePrompt} in cinematic lighting`,
      `${basePrompt} in abstract futuristic style`,
    ];

    const images = await Promise.all(
      promptVariants.map((variant) =>
        c.env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: variant })
      )
    );

    imageTags = images
      .map((result, index) => {
        const base64Image = result.image;
        if (typeof base64Image === "string") {
          return `
            <div class="image-box">
              <img src="data:image/png;base64,${base64Image}" alt="Generated Image ${index + 1}" />
            </div>`;
        }
        return `<p>Error al generar la imagen ${index + 1}</p>`;
      })
      .join("\n");
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IA Image Generator</title>
  <style>
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(to right, #ece9e6, #ffffff);
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
    }

    h1 {
      color: #4a90e2;
      margin-bottom: 1rem;
      font-size: 2.2rem;
    }

    form {
      margin-bottom: 2rem;
      background: #f9f9f9;
      padding: 1rem 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }

    input[type="text"] {
      padding: 0.8rem;
      width: 360px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 1rem;
    }

    button {
      padding: 0.8rem 1.8rem;
      background-color: #4a90e2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.3s ease;
    }

    button:hover {
      background-color: #357ab8;
    }

    .image-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2rem;
      margin-top: 2rem;
      margin-bottom: 2rem;
    }

    .image-box img {
      width: 400px;
      height: auto;
      border-radius: 16px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
    }

    .footer {
      margin-top: 3rem;
      font-size: 0.9rem;
      color: #888;
    }
  </style>
</head>
<body>
  <h1>Genera tu imagen con IA</h1>
  <form method="get" action="/image-preview">
    <input type="text" name="prompt" value="${basePrompt ?? ''}" placeholder="Describe tu imagen ideal..." />
    <button type="submit">Generar Imagen</button>
  </form>

  <div class="image-container">
    ${imageTags}
  </div>

  <div class="footer">
    © 2025 IA Imagen Generator | Creado con ❤️ por Jean Piers
  </div>
</body>
</html>
  `;

  return c.html(html);
});




export default app;