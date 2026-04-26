import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Globe } from "lucide-react";

const LAST_UPDATED = "26 de abril de 2026";

const content = {
  es: {
    lang: "ES",
    title: "Contrato de Licencia",
    subtitle: "EULA — Acuerdo de Usuario Final",
    updated: `Última actualización: ${LAST_UPDATED}`,
    intro: `Este Contrato de Licencia de Usuario Final ("EULA" o "Contrato") es un acuerdo legal entre usted ("Usuario") y YaPide ("la Empresa", "nosotros"), con domicilio en la República Dominicana. Al descargar, instalar o usar la aplicación YaPide, usted acepta los términos y condiciones de este Contrato. Si no está de acuerdo, no use la aplicación.`,
    sections: [
      {
        title: "1. Licencia de uso",
        body: "YaPide le otorga una licencia limitada, no exclusiva, intransferible y revocable para instalar y usar la aplicación en dispositivos de su propiedad, exclusivamente para los fines descritos en este Contrato. Esta licencia no le otorga ningún derecho sobre el código fuente, la arquitectura ni las marcas de YaPide.",
      },
      {
        title: "2. Elegibilidad",
        items: [
          "Debes tener al menos 18 años para usar YaPide.",
          "Si te registras como conductor, debes poseer una licencia de conducir válida y documentación legal del vehículo según las leyes de la República Dominicana.",
          "Si registras un negocio, debes ser el propietario o representante autorizado del establecimiento.",
          "No puedes crear más de una cuenta por rol sin autorización expresa de YaPide.",
        ],
      },
      {
        title: "3. Roles y responsabilidades",
        subsections: [
          {
            name: "👤 Cliente",
            items: [
              "Proporcionar una dirección de entrega válida y accesible.",
              "Estar disponible para recibir el pedido o notificar al conductor.",
              "Pagar el monto total del pedido incluyendo tarifa de entrega y propina voluntaria.",
              "No realizar pedidos fraudulentos ni cancelar de forma abusiva.",
            ],
          },
          {
            name: "🚗 Conductor",
            items: [
              "Entregar los pedidos de forma segura, puntual y en buenas condiciones.",
              "Mantener documentos del vehículo y licencia de conducir vigentes.",
              "Respetar las leyes de tránsito de la República Dominicana en todo momento.",
              "No compartir información del cliente con terceros.",
              "Mantener el nivel de calificación mínimo requerido por YaPide.",
            ],
          },
          {
            name: "🏪 Negocio",
            items: [
              "Publicar información veraz sobre productos, precios y horarios de operación.",
              "Preparar los pedidos con la calidad y en el tiempo indicados.",
              "Notificar a YaPide sobre cambios en el menú, precios o disponibilidad.",
              "Cumplir con las regulaciones sanitarias y comerciales de la República Dominicana.",
              "No cobrar tarifas adicionales no autorizadas por YaPide.",
            ],
          },
        ],
      },
      {
        title: "4. Usos prohibidos",
        items: [
          "Usar YaPide para actividades ilícitas, fraudulentas o que violen leyes dominicanas o internacionales.",
          "Suplantar la identidad de otro usuario, negocio o conductor.",
          "Manipular calificaciones, reseñas o el sistema de propinas.",
          "Hacer ingeniería inversa, descompilar o intentar extraer el código fuente de la aplicación.",
          "Usar bots, scripts automatizados o herramientas para realizar acciones masivas en la plataforma.",
          "Publicar contenido ofensivo, discriminatorio o ilegal en chats, reseñas o perfiles.",
          "Revender o sublicenciar el acceso a YaPide sin autorización escrita.",
        ],
      },
      {
        title: "5. Pagos y comisiones",
        body: "YaPide cobra una comisión sobre los pedidos procesados a través de la plataforma, según las tarifas vigentes comunicadas a negocios y conductores al momento del registro. Las tarifas pueden modificarse con 15 días de aviso previo. Los conductores reciben sus ganancias de acuerdo al calendario de pagos publicado en la app. YaPide no garantiza un nivel mínimo de ingresos a conductores.",
      },
      {
        title: "6. Propiedad intelectual",
        body: "Todo el contenido de YaPide — incluyendo diseño, código, logotipos, textos, imágenes y la marca YaPide — es propiedad exclusiva de la Empresa y está protegido por las leyes de propiedad intelectual de la República Dominicana y tratados internacionales. Queda prohibida su reproducción o uso sin autorización escrita.",
      },
      {
        title: "7. Suspensión y cancelación de cuentas",
        items: [
          "YaPide puede suspender o cancelar tu cuenta si violas este Contrato, presentas documentos falsos o recibes reportes graves de otros usuarios.",
          "Las suspensiones temporales pueden aplicarse mientras se investiga un incidente.",
          "Puedes cancelar tu cuenta en cualquier momento desde la app. Los fondos pendientes de conductores serán liquidados en el siguiente ciclo de pagos.",
          "YaPide se reserva el derecho de rechazar el servicio a cualquier usuario sin obligación de dar una justificación pública.",
        ],
      },
      {
        title: "8. Limitación de responsabilidad",
        body: "YaPide actúa como intermediario tecnológico entre clientes, conductores y negocios. No somos responsables por: (a) daños o pérdidas ocurridos durante la entrega más allá del valor del pedido; (b) demoras causadas por tráfico, clima u otras circunstancias ajenas a nuestra plataforma; (c) la calidad de los productos preparados por los negocios; (d) daños indirectos, incidentales o consecuentes. La responsabilidad máxima de YaPide ante un Usuario por cualquier reclamación no excederá el monto del pedido en cuestión.",
      },
      {
        title: "9. Modificaciones al contrato",
        body: "YaPide puede modificar este EULA en cualquier momento. Notificaremos los cambios materiales con al menos 15 días de anticipación mediante la app o por correo electrónico. El uso continuado de la plataforma después de la fecha de entrada en vigor constituirá aceptación de los cambios.",
      },
      {
        title: "10. Ley aplicable y jurisdicción",
        body: "Este Contrato se rige por las leyes de la República Dominicana. Cualquier controversia que no se resuelva amigablemente será sometida a la jurisdicción de los tribunales competentes del Distrito Nacional, Santo Domingo, República Dominicana.",
      },
      {
        title: "11. Contacto",
        body: "Para consultas sobre este Contrato: legal@yapide.app | Santo Domingo, República Dominicana.",
      },
    ],
  },
  en: {
    lang: "EN",
    title: "License Agreement",
    subtitle: "EULA — End User License Agreement",
    updated: `Last updated: ${LAST_UPDATED}`,
    intro: `This End User License Agreement ("EULA" or "Agreement") is a legal agreement between you ("User") and YaPide ("the Company", "we"), incorporated in the Dominican Republic. By downloading, installing, or using the YaPide app, you agree to the terms and conditions of this Agreement. If you do not agree, do not use the app.`,
    sections: [
      {
        title: "1. License Grant",
        body: "YaPide grants you a limited, non-exclusive, non-transferable, revocable license to install and use the app on devices you own, solely for the purposes described in this Agreement. This license does not grant you any rights to the source code, architecture, or YaPide trademarks.",
      },
      {
        title: "2. Eligibility",
        items: [
          "You must be at least 18 years old to use YaPide.",
          "If registering as a driver, you must hold a valid driver's license and legal vehicle documentation under Dominican law.",
          "If registering a business, you must be the owner or authorized representative of the establishment.",
          "You may not create more than one account per role without express authorization from YaPide.",
        ],
      },
      {
        title: "3. Roles and Responsibilities",
        subsections: [
          {
            name: "👤 Customer",
            items: [
              "Provide a valid, accessible delivery address.",
              "Be available to receive the order or notify the driver.",
              "Pay the full order amount including delivery fee and optional tip.",
              "Do not place fraudulent orders or cancel abusively.",
            ],
          },
          {
            name: "🚗 Driver",
            items: [
              "Deliver orders safely, on time, and in good condition.",
              "Maintain valid vehicle documents and driver's license.",
              "Comply with Dominican Republic traffic laws at all times.",
              "Do not share customer information with third parties.",
              "Maintain the minimum rating level required by YaPide.",
            ],
          },
          {
            name: "🏪 Business",
            items: [
              "Publish accurate information about products, prices, and operating hours.",
              "Prepare orders to the quality and within the timeframe stated.",
              "Notify YaPide of changes to the menu, prices, or availability.",
              "Comply with Dominican Republic health and commercial regulations.",
              "Do not charge additional fees not authorized by YaPide.",
            ],
          },
        ],
      },
      {
        title: "4. Prohibited Uses",
        items: [
          "Use YaPide for illegal, fraudulent, or criminal activities under Dominican or international law.",
          "Impersonate another user, business, or driver.",
          "Manipulate ratings, reviews, or the tipping system.",
          "Reverse engineer, decompile, or attempt to extract the app's source code.",
          "Use bots, automated scripts, or tools to perform bulk actions on the platform.",
          "Post offensive, discriminatory, or illegal content in chats, reviews, or profiles.",
          "Resell or sublicense access to YaPide without written authorization.",
        ],
      },
      {
        title: "5. Payments and Commissions",
        body: "YaPide charges a commission on orders processed through the platform, per the rates communicated to businesses and drivers at registration. Rates may be modified with 15 days prior notice. Drivers receive their earnings per the payout schedule published in the app. YaPide does not guarantee a minimum income level for drivers.",
      },
      {
        title: "6. Intellectual Property",
        body: "All YaPide content — including design, code, logos, text, images, and the YaPide brand — is the exclusive property of the Company and is protected by the intellectual property laws of the Dominican Republic and international treaties. Reproduction or use without written authorization is prohibited.",
      },
      {
        title: "7. Account Suspension and Termination",
        items: [
          "YaPide may suspend or cancel your account if you violate this Agreement, submit false documents, or receive serious reports from other users.",
          "Temporary suspensions may apply while an incident is investigated.",
          "You may cancel your account at any time through the app. Pending driver funds will be settled in the next payout cycle.",
          "YaPide reserves the right to refuse service to any user without obligation to provide a public justification.",
        ],
      },
      {
        title: "8. Limitation of Liability",
        body: "YaPide acts as a technology intermediary between customers, drivers, and businesses. We are not responsible for: (a) damage or loss during delivery beyond the order value; (b) delays caused by traffic, weather, or circumstances beyond our platform; (c) the quality of products prepared by businesses; (d) indirect, incidental, or consequential damages. YaPide's maximum liability to a User for any claim shall not exceed the value of the order in question.",
      },
      {
        title: "9. Amendments",
        body: "YaPide may amend this EULA at any time. We will notify material changes at least 15 days in advance via the app or email. Continued use of the platform after the effective date constitutes acceptance of the changes.",
      },
      {
        title: "10. Governing Law and Jurisdiction",
        body: "This Agreement is governed by the laws of the Dominican Republic. Any dispute not resolved amicably shall be submitted to the competent courts of the Distrito Nacional, Santo Domingo, Dominican Republic.",
      },
      {
        title: "11. Contact",
        body: "For questions about this Agreement: legal@yapide.app | Santo Domingo, Dominican Republic.",
      },
    ],
  },
};

function renderText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="text-yellow-400 font-bold">{p}</strong> : <span key={i}>{p}</span>
  );
}

export default function EULA() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const c = content[lang];

  return (
    <div className="min-h-screen bg-background text-white max-w-[430px] mx-auto">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 py-3">
        <Link href="/">
          <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">YaPide</span>
          </button>
        </Link>
        <div className="text-center">
          <h1 className="font-black text-sm text-yellow-400 leading-none">{c.title}</h1>
          <p className="text-white/40 text-[10px] mt-0.5">EULA</p>
        </div>
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="flex items-center gap-1 text-xs font-bold border border-white/20 px-2 py-1 rounded-full hover:border-yellow-400/60 transition-colors"
        >
          <Globe className="w-3 h-3" />
          {lang === "es" ? "EN" : "ES"}
        </button>
      </div>

      <div className="px-5 py-6 space-y-6">
        <div>
          <p className="text-white/40 text-xs mb-3">{c.updated}</p>
          <p className="text-white/70 text-sm leading-relaxed">{c.intro}</p>
        </div>

        {c.sections.map((section, i) => (
          <div key={i} className="space-y-2">
            <h2 className="font-black text-white text-sm">{section.title}</h2>
            {section.body && (
              <p className="text-white/70 text-sm leading-relaxed">{renderText(section.body)}</p>
            )}
            {section.items && (
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-sm text-white/70 leading-relaxed">
                    <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                    <span>{renderText(item)}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.subsections && (
              <div className="space-y-4 mt-2">
                {section.subsections.map((sub, j) => (
                  <div key={j} className="bg-white/5 rounded-xl p-3 border border-white/8">
                    <h3 className="font-bold text-white text-sm mb-2">{sub.name}</h3>
                    <ul className="space-y-1.5">
                      {sub.items.map((item, k) => (
                        <li key={k} className="flex gap-2 text-sm text-white/70 leading-relaxed">
                          <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                          <span>{renderText(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 pb-10 border-t border-white/10 text-center">
          <p className="text-white/30 text-xs">© 2026 YaPide · República Dominicana</p>
          <Link href="/privacy">
            <span className="text-yellow-400/70 text-xs hover:text-yellow-400 transition-colors mt-1 inline-block">
              {lang === "es" ? "Ver Política de Privacidad →" : "View Privacy Policy →"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
