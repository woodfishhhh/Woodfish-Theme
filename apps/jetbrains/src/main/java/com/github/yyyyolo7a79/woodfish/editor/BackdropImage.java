package com.github.yyyyolo7a79.woodfish.editor;

import com.github.yyyyolo7a79.woodfish.core.color.GlowBlur;
import com.github.yyyyolo7a79.woodfish.settings.SharedDefaults;
import com.twelvemonkeys.imageio.plugins.webp.WebPImageReaderSpi;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferInt;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

/** Decode the first frame within the shared picture limits and prepare the soft image off the EDT. */
final class BackdropImage {
    private BackdropImage() {}

    static BufferedImage read(String file, double blur) throws IOException {
        if (file.isBlank()) {
            try (InputStream in = BackdropImage.class.getResourceAsStream("/woodfish/caiyun.webp")) {
                if (in == null) throw new IOException("Missing bundled cloud image");
                return decode(in, blur);
            }
        }
        Path path = Path.of(file);
        if (!Files.isRegularFile(path) || Files.size(path) > SharedDefaults.number("image.maxInputBytes"))
            throw new IOException("Unsupported background file size");
        try (InputStream in = Files.newInputStream(path)) { return decode(in, blur); }
    }

    private static BufferedImage decode(InputStream in, double blur) throws IOException {
        try (var stream = new MemoryCacheImageInputStream(in)) {
            var webp = new WebPImageReaderSpi();
            ImageReader reader;
            if (webp.canDecodeInput(stream)) reader = webp.createReaderInstance(null);
            else {
                Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext()) throw new IOException("Unsupported background image format");
                reader = readers.next();
            }
            try {
                reader.setInput(stream, true, true);
                if (!Set.of("jpeg", "jpg", "png", "webp").contains(reader.getFormatName().toLowerCase(Locale.ROOT)))
                    throw new IOException("Unsupported background image format");
                int width = reader.getWidth(0), height = reader.getHeight(0);
                int longest = Math.max(width, height);
                if (longest > SharedDefaults.number("image.maxDecodeEdge") || (long) width * height > 64_000_000L)
                    throw new IOException("Background image dimensions exceed the decode limit");
                int sample = Math.max(1, (int) Math.ceil(longest / SharedDefaults.number("image.maxEdge")));
                var param = reader.getDefaultReadParam();
                param.setSourceSubsampling(sample, sample, 0, 0);
                return soften(reader.read(0, param), blur);
            } finally { reader.dispose(); }
        }
    }

    private static BufferedImage soften(BufferedImage image, double blur) {
        if (blur <= 0) return image;
        BufferedImage soft = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_ARGB_PRE);
        Graphics2D g = soft.createGraphics();
        try { g.drawImage(image, 0, 0, null); } finally { g.dispose(); }
        int[] pixels = ((DataBufferInt) soft.getRaster().getDataBuffer()).getData();
        GlowBlur.blurPremultiplied(pixels, soft.getWidth(), soft.getHeight(), blur / 2);
        return soft;
    }
}
