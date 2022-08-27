import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

precacheAndRoute(self.__WB_MANIFEST);
//    /https:\/\/api\.exchangeratesapi\.io\/latest/,
registerRoute(
    new RegExp("https://fonts.googleapis.com/icon.*"),
    new StaleWhileRevalidate({})
);
registerRoute(
    new RegExp(
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2.*"
    ),
    new StaleWhileRevalidate({})
);
registerRoute(new RegExp(".*\\.svg"), new StaleWhileRevalidate({}));
registerRoute(new RegExp(".*\\.png"), new StaleWhileRevalidate({}));
registerRoute(new RegExp(".*\\.css"), new StaleWhileRevalidate({}));
registerRoute(
    new RegExp(".*\\.placeholder"),
    new StaleWhileRevalidate({
        cacheName: "currencies",
        plugins: [
            new ExpirationPlugin({
                maxAgeSeconds: 10 * 60, // 10 minutes
            }),
        ],
    })
);
