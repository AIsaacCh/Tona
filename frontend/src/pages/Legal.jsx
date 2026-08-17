import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import terminosText from "../legal/terminos.md?raw";
import privacidadText from "../legal/privacidad.md?raw";
import { T } from "../tokens";

const DOCS = { terminos: terminosText, privacidad: privacidadText };

export default function Legal() {
  const { tipo } = useParams(); // "terminos" | "privacidad"
  const texto = DOCS[tipo] || DOCS.terminos;

  return (
    <div style={{ minHeight: "100vh", background: T.obs, padding: "40px 20px", display: "flex", justifyContent: "center" }}>
      <div style={{
        maxWidth: 720, width: "100%", color: "rgba(237,235,230,0.75)",
        fontFamily: T.sans, fontSize: 14, lineHeight: 1.7,
      }}>
        <Link to="/" style={{ color: T.jade, fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 24 }}>
          ← Volver
        </Link>
        <div className="legal-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
        </div>
      </div>
      <style>{`
        .legal-markdown h1 { font-family: ${T.serif}; font-size: 24px; color: rgba(237,235,230,0.94); margin: 28px 0 12px; }
        .legal-markdown h2 { font-family: ${T.serif}; font-size: 18px; color: ${T.jade}; margin: 24px 0 10px; }
        .legal-markdown h3 { font-size: 15px; color: rgba(237,235,230,0.85); margin: 18px 0 8px; }
        .legal-markdown a { color: ${T.turquesa}; }
        .legal-markdown table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .legal-markdown th, .legal-markdown td { border: 1px solid ${T.cen}; padding: 8px 10px; text-align: left; }
        .legal-markdown blockquote { border-left: 2px solid ${T.copal}; padding-left: 14px; color: rgba(237,235,230,0.45); font-size: 13px; margin: 16px 0; }
        .legal-markdown hr { border: none; border-top: 1px solid ${T.cen}; margin: 24px 0; }
      `}</style>
    </div>
  );
}