import { useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Globe } from "lucide-react";

const LAST_UPDATED = "26 de abril de 2026";

const content = {
  es: {
    lang: "ES",
    title: "Política de Privacidad",
    updated: `Última actualización: ${LAST_UPDATED}`,
    intro: `YaPide ("nosotros", "la plataforma") opera la aplicación móvil y el sitio web YaPide, un servicio de entregas a domicilio en la República Dominicana. Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos tu información personal de conformidad con la Ley 172-13 sobre Protección de Datos Personales de la República Dominicana y las normas aplicables.`,
    sections: [
      {
        title: "1. Información que recopilamos",
        items: [
          "**Datos de cuenta:** nombre completo, correo electrónico, número de teléfono, contraseña cifrada y rol (cliente, conductor, negocio o administrador).",
          "**Datos de ubicación:** ubicación en tiempo real del conductor (solo cuando está en turno activo), dirección de entrega del cliente y ubicación del negocio.",
          "**Datos de transacción:** historial de pedidos, métodos de pago, montos pagados, propinas, descuentos aplicados y facturas.",
          "**Datos del dispositivo:** tipo de dispositivo, sistema operativo, token de notificación push e identificadores técnicos.",
          "**Comunicaciones:** mensajes en el chat de pedidos entre cliente y conductor.",
          "**Información del negocio:** nombre del establecimiento, menú, horarios de operación y datos bancarios para pagos.",
          "**Información del conductor:** número de cédula, placa del vehículo, tipo de vehículo y documentos de verificación.",
        ],
      },
      {
        title: "2. Cómo usamos tu información",
        items: [
          "Procesar y entregar tus pedidos, y comunicar actualizaciones de estado en tiempo real.",
          "Verificar la identidad de conductores y negocios para garantizar la seguridad de la plataforma.",
          "Calcular tarifas de entrega, comisiones y pagos a conductores.",
          "Enviar notificaciones push sobre el estado de tu pedido, ofertas y actualizaciones importantes.",
          "Mejorar la experiencia de usuario y el rendimiento de la plataforma mediante análisis agregados y anónimos.",
          "Cumplir con obligaciones legales, fiscales y regulatorias en la República Dominicana.",
          "Prevenir fraudes, abusos y actividades ilícitas.",
        ],
      },
      {
        title: "3. Compartir información con terceros",
        items: [
          "**Negocios:** reciben nombre del cliente, dirección de entrega y contenido del pedido para preparar y despachar los productos.",
          "**Conductores:** reciben nombre del cliente, dirección de entrega y número de teléfono para coordinar la entrega.",
          "**Procesadores de pago:** compartimos datos de transacción con Stripe (u operadores locales) exclusivamente para procesar pagos de forma segura.",
          "**Autoridades:** divulgamos información cuando la ley dominicana o una orden judicial lo exija.",
          "No vendemos ni alquilamos tu información personal a terceros con fines publicitarios.",
        ],
      },
      {
        title: "4. Retención de datos",
        body: "Conservamos tu información mientras tu cuenta esté activa. Al eliminar tu cuenta, borramos o anonimizamos tus datos personales en un plazo de 30 días, salvo que una obligación legal exija conservarlos por más tiempo (por ejemplo, registros de transacciones por 5 años según normativa fiscal dominicana).",
      },
      {
        title: "5. Seguridad",
        body: "Utilizamos cifrado TLS en todas las comunicaciones, contraseñas almacenadas con bcrypt y control de acceso por rol (RBAC). Revisamos periódicamente nuestras prácticas de seguridad. Sin embargo, ningún sistema es infalible; te recomendamos usar una contraseña fuerte y única.",
      },
      {
        title: "6. Tus derechos (Ley 172-13)",
        items: [
          "**Acceso:** solicitar una copia de los datos personales que tenemos sobre ti.",
          "**Rectificación:** corregir datos inexactos o incompletos.",
          "**Cancelación:** solicitar la eliminación de tus datos cuando ya no sean necesarios.",
          "**Oposición:** oponerte al tratamiento de tus datos en ciertos casos.",
          "Para ejercer tus derechos, escríbenos a privacidad@yapide.app. Responderemos en un plazo máximo de 15 días hábiles.",
        ],
      },
      {
        title: "7. Menores de edad",
        body: "YaPide no está dirigida a menores de 18 años. No recopilamos conscientemente datos de menores. Si eres padre/madre o tutor y crees que tu hijo ha creado una cuenta, contáctanos para eliminarla.",
      },
      {
        title: "8. Cambios a esta política",
        body: "Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos mediante la app o correo electrónico con al menos 15 días de anticipación antes de que entren en vigor cambios materiales.",
      },
      {
        title: "9. Contacto",
        body: "YaPide — privacidad@yapide.app | Santo Domingo, República Dominicana.",
      },
    ],
  },
  en: {
    lang: "EN",
    title: "Privacy Policy",
    updated: `Last updated: ${LAST_UPDATED}`,
    intro: `YaPide ("we", "the platform") operates the YaPide mobile app and website, a last-mile delivery service in the Dominican Republic. This Privacy Policy explains how we collect, use, and protect your personal information in compliance with Dominican Law 172-13 on Personal Data Protection and applicable regulations.`,
    sections: [
      {
        title: "1. Information We Collect",
        items: [
          "**Account data:** full name, email address, phone number, hashed password, and role (customer, driver, business, or admin).",
          "**Location data:** real-time driver location (only during active shifts), customer delivery address, and business location.",
          "**Transaction data:** order history, payment methods, amounts, tips, discounts, and receipts.",
          "**Device data:** device type, OS, push notification token, and technical identifiers.",
          "**Communications:** chat messages between customer and driver within an order.",
          "**Business information:** business name, menu, operating hours, and banking details for payouts.",
          "**Driver information:** national ID number, vehicle plate, vehicle type, and verification documents.",
        ],
      },
      {
        title: "2. How We Use Your Information",
        items: [
          "Process and deliver your orders and communicate real-time status updates.",
          "Verify the identity of drivers and businesses to ensure platform safety.",
          "Calculate delivery fees, commissions, and driver payouts.",
          "Send push notifications about order status, promotions, and important updates.",
          "Improve user experience and platform performance through aggregated, anonymous analytics.",
          "Comply with legal, tax, and regulatory obligations in the Dominican Republic.",
          "Prevent fraud, abuse, and illegal activity.",
        ],
      },
      {
        title: "3. Sharing with Third Parties",
        items: [
          "**Businesses:** receive the customer's name, delivery address, and order contents to prepare and dispatch products.",
          "**Drivers:** receive the customer's name, delivery address, and phone number to coordinate delivery.",
          "**Payment processors:** we share transaction data with Stripe (or local processors) solely to process payments securely.",
          "**Authorities:** we disclose information when required by Dominican law or a court order.",
          "We do not sell or rent your personal information to third parties for advertising purposes.",
        ],
      },
      {
        title: "4. Data Retention",
        body: "We retain your information while your account is active. Upon account deletion, we erase or anonymize your personal data within 30 days, unless a legal obligation requires longer retention (e.g., transaction records for 5 years under Dominican tax regulations).",
      },
      {
        title: "5. Security",
        body: "We use TLS encryption for all communications, bcrypt-hashed passwords, and role-based access control (RBAC). We periodically review our security practices. No system is foolproof — we recommend using a strong, unique password.",
      },
      {
        title: "6. Your Rights (Law 172-13)",
        items: [
          "**Access:** request a copy of the personal data we hold about you.",
          "**Rectification:** correct inaccurate or incomplete data.",
          "**Cancellation:** request deletion of your data when it is no longer necessary.",
          "**Opposition:** object to the processing of your data in certain cases.",
          "To exercise your rights, email us at privacidad@yapide.app. We will respond within 15 business days.",
        ],
      },
      {
        title: "7. Minors",
        body: "YaPide is not intended for users under 18. We do not knowingly collect data from minors. If you are a parent or guardian and believe your child created an account, contact us for immediate deletion.",
      },
      {
        title: "8. Changes to This Policy",
        body: "We may update this Privacy Policy periodically. We will notify you via the app or email at least 15 days before material changes take effect.",
      },
      {
        title: "9. Contact",
        body: "YaPide — privacidad@yapide.app | Santo Domingo, Dominican Republic.",
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

export default function PrivacyPolicy() {
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
        <h1 className="font-black text-base text-yellow-400">{c.title}</h1>
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
          </div>
        ))}

        <div className="pt-4 pb-10 border-t border-white/10 text-center">
          <p className="text-white/30 text-xs">© 2026 YaPide · República Dominicana</p>
          <Link href="/eula">
            <span className="text-yellow-400/70 text-xs hover:text-yellow-400 transition-colors mt-1 inline-block">
              {lang === "es" ? "Ver Contrato de Licencia (EULA) →" : "View License Agreement (EULA) →"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
