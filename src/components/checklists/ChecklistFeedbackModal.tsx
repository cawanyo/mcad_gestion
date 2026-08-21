'use client';

import React from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  User,
  X,
  Sparkles,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

interface ChecklistFeedbackModalProps {
  checklist: any;
  onClose: () => void;
}

export const ChecklistFeedbackModal: React.FC<ChecklistFeedbackModalProps> = ({
  checklist,
  onClose
}) => {
  const [executions, setExecutions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/checklists/execution?checklistId=${checklist.id}`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data);
      }
    } catch (e) {
      console.error('Error fetching executions:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExecutions();
  }, [checklist.id]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Retours & Historique d'exécution
              </h2>
              <p className="text-xs text-slate-500">
                {checklist.title} • {executions.length} exécution(s) enregistrée(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span>Chargement des retours...</span>
            </div>
          ) : executions.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-3xl">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">Aucune exécution enregistrée pour cette checklist.</p>
              <p className="text-[11px] text-slate-400">
                Les retours et commentaires des membres s'afficheront ici lorsqu'ils utiliseront cette checklist.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">
                          {item.user?.firstName} {item.user?.lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">{item.user?.phone || 'Membre de service'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Validée</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(item.completedAt || item.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Comment if provided */}
                  {item.comment ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                        Commentaire / Observation :
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{item.comment}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Aucun commentaire particulier laissé lors de cette exécution.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
