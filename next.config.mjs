/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    // ✅ Ative a otimização do next/image
    // (Remova ou deixe como false)
    // unoptimized: false,

    // 🔓 Libere domínios remotos (ajuste conforme usa)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      // { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" }, // se usar fotos do Google
      // { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },       // exemplo
    ],

    // 💡 Tamanhos sugeridos para gerar srcsets melhores no mobile
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
