import React, { useState } from 'react';
import { X, Copy, Check, Globe, ShieldCheck, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface GoogleSitesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSitesModal: React.FC<GoogleSitesModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(true);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://seu-app.run.app';
  const isDevUrl = currentUrl.includes('-dev-');
  const suggestedPublicUrl = isDevUrl ? currentUrl.replace('-dev-', '-pre-') : currentUrl;

  const embedCode = `<iframe 
  src="${suggestedPublicUrl}" 
  width="100%" 
  height="900" 
  style="border: 0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" 
  allow="clipboard-write; fullscreen"
  loading="lazy">
</iframe>`;

  const handleCopyUrl = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Como Corrigir e Incorporar no Google Sites
              </h3>
              <p className="text-xs text-slate-400">
                Guia rápido para resolver mensagens de bloqueio e exibir o painel com sucesso.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dev URL Warning if applicable */}
        {isDevUrl && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-white block">Atenção ao Link Privado de Desenvolvimento:</strong>
              <p className="text-amber-200/90 leading-relaxed text-[11px]">
                A URL atual (<code className="bg-amber-950 px-1 py-0.5 rounded text-amber-300">...-dev-...</code>) é de uso exclusivo do editor e pode exibir <span className="underline font-semibold">&quot;recusou a conexão&quot;</span> se colada diretamente em outro site.
              </p>
              <p className="text-amber-200/90 leading-relaxed text-[11px]">
                Para que o Google Sites acesse normalmente, utilize o botão <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3 h-3 text-sky-400" /> Share (Compartilhar)</strong> no topo da tela do AI Studio para gerar a URL pública.
              </p>
            </div>
          </div>
        )}

        {/* Troubleshooting / Erros mais comuns */}
        <div className="mb-4 rounded-xl border border-sky-800/50 bg-sky-950/20 overflow-hidden">
          <button
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-semibold text-sky-300 hover:bg-sky-900/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Solução para as mensagens mais comuns do Google Sites:
            </span>
            {showTroubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTroubleshooting && (
            <div className="p-3.5 pt-0 border-t border-sky-800/30 space-y-2.5 text-[11.5px] text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-amber-300 block mb-0.5">
                  1. &quot;Não é possível incorporar devido a restrições do provedor&quot;
                </span>
                <p className="text-slate-400">
                  <strong>Solução:</strong> Isso ocorre ao usar a aba <em className="text-slate-200">&quot;Por URL&quot;</em>. Para resolver, no Google Sites escolha a segunda aba: <strong className="text-emerald-400">&quot;Código de incorporação&quot;</strong> (ícone <code className="text-sky-300">&lt;/&gt;</code>) e cole o código do <code className="text-sky-300">&lt;iframe&gt;</code> (Método 1 abaixo).
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-rose-300 block mb-0.5">
                  2. &quot;...run.app recusou a conexão&quot; ou tela cinza
                </span>
                <p className="text-slate-400">
                  <strong>Solução:</strong> Isso ocorre quando se cola o endereço interno de desenvolvimento (<code className="text-slate-300">ais-dev-...</code>). Clique no botão <strong className="text-white">Share</strong> do AI Studio para gerar a URL pública compartilhada e cole-a no seu iframe.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-sky-300 block mb-0.5">
                  3. &quot;Não é possível mostrar uma visualização&quot; (no modo de edição)
                </span>
                <p className="text-slate-400">
                  <strong>Solução:</strong> O editor do Google Sites desativa certas visualizações rascunho. Clique no botão de olho (<strong className="text-slate-200">Visualizar</strong>) ou em <strong className="text-white">Publicar</strong> para testar a página no ar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recommended Option: HTML Iframe Embed */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                Método Recomendado: Código de Incorporação (&lt;iframe&gt;)
              </span>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium flex items-center gap-1 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Cole este código no Google Sites clicando em <strong>Inserir ➜ Incorporar ➜ Código de incorporação</strong>:
            </p>
            <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300 text-[11px] overflow-x-auto select-all whitespace-pre-wrap">
              {embedCode}
            </pre>
          </div>

          {/* Option 2: By URL */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                URL Direta da Aplicação
              </span>
              <button
                onClick={() => handleCopyUrl(suggestedPublicUrl)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium flex items-center gap-1 transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Se for usar em outros portais ou navegação direta:
            </p>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-sky-300 break-all select-all text-[11px]">
              {suggestedPublicUrl}
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-700/40 text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-white block">Credenciais 100% Blindadas:</strong>
              As senhas e tokens da API WhatsFlux ficam protegidos no backend Node.js. Qualquer usuário que acessar pelo seu Google Sites apenas visualiza as transferências e auditorias, sem acesso às senhas de login.
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
          >
            Entendido, fechar
          </button>
        </div>
      </div>
    </div>
  );
};
