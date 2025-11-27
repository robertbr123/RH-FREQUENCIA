import { useState, useEffect } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface FAQListProps {
  onContactAdmin: () => void;
}

export default function FAQList({ onContactAdmin }: FAQListProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/faq', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaqs(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar FAQs:', error);
      // Se não há FAQs ou tabela não existe, continua sem erro
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Todos', ...new Set(faqs.map(faq => faq.category))];

  const filteredFaqs = categoryFilter === 'Todos' 
    ? faqs 
    : faqs.filter(faq => faq.category === categoryFilter);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">
          Perguntas Frequentes
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Não encontrou sua resposta? Fale com o administrador
        </p>
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {faqs.length === 0 
                ? 'Nenhuma pergunta frequente disponível ainda.'
                : 'Nenhuma pergunta nesta categoria.'}
            </p>
          </div>
        ) : (
          filteredFaqs.map(faq => (
            <div 
              key={faq.id}
              className="border border-gray-200 rounded-lg bg-white overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(faq.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 pr-2">
                    {faq.question}
                  </h4>
                  <span className="text-xs text-blue-600 mt-1 inline-block">
                    {faq.category}
                  </span>
                </div>
                {expandedId === faq.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {expandedId === faq.id && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Contact Admin Button */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <button
          onClick={onContactAdmin}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <MessageCircle className="h-5 w-5" />
          Não resolveu? Falar com Administrador
        </button>
      </div>
    </div>
  );
}
