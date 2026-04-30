/**
 * Página de Checkout
 * 
 * Página de finalização do pedido com:
 * - Formulário de dados do cliente
 * - Validação de campos obrigatórios
 * - Máscara para telefone
 * - Validação de bairro com API
 * - Cálculo de taxa de entrega
 * - Resumo do pedido
 * - Integração com CarrinhoContext
 * 
 * Features:
 * - Validação em tempo real
 * - Feedback visual
 * - Estados de loading
 * - Tratamento de erros
 */

import React, { useState, useEffect } from 'react';
import { useCarrinho } from '../../hooks/useCarrinho';
import { bairroService, pedidoService } from '../../services';
import { formatarPreco, formatarTelefone } from '../../utils/formatters';
import { CriarPedidoDTO, ItemPedidoDTO } from '../../types/domain.types';
import './styles.css';

interface FormData {
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  observacao: string;
}

interface FormErrors {
  nome?: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
}

interface BairroValidation {
  isValidating: boolean;
  isValid: boolean;
  taxa: number;
  error?: string;
}

export const Checkout: React.FC = () => {
  const { itens, subtotal, taxaEntrega, total, definirTaxaEntrega, limparCarrinho } = useCarrinho();

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    telefone: '',
    endereco: '',
    bairro: '',
    observacao: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bairroValidation, setBairroValidation] = useState<BairroValidation>({
    isValidating: false,
    isValid: false,
    taxa: 0,
  });

  /**
   * Valida o bairro com a API
   */
  useEffect(() => {
    const validateBairro = async () => {
      const bairroTrimmed = formData.bairro.trim();

      if (bairroTrimmed.length < 3) {
        setBairroValidation({
          isValidating: false,
          isValid: false,
          taxa: 0,
        });
        definirTaxaEntrega(0);
        return;
      }

      setBairroValidation((prev) => ({ ...prev, isValidating: true }));

      try {
        const response = await bairroService.validar(bairroTrimmed);

        if (response.valido) {
          setBairroValidation({
            isValidating: false,
            isValid: true,
            taxa: response.taxa,
          });
          definirTaxaEntrega(response.taxa);
          setErrors((prev) => ({ ...prev, bairro: undefined }));
        } else {
          setBairroValidation({
            isValidating: false,
            isValid: false,
            taxa: 0,
            error: 'Bairro não atendido',
          });
          definirTaxaEntrega(0);
          setErrors((prev) => ({
            ...prev,
            bairro: 'Desculpe, não atendemos este bairro',
          }));
        }
      } catch (error) {
        setBairroValidation({
          isValidating: false,
          isValid: false,
          taxa: 0,
          error: 'Erro ao validar bairro',
        });
        definirTaxaEntrega(0);
      }
    };

    const timeoutId = setTimeout(validateBairro, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.bairro, definirTaxaEntrega]);

  /**
   * Aplica máscara de telefone
   */
  const applyPhoneMask = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  };

  /**
   * Valida um campo específico
   */
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'nome':
        if (value.trim().length < 3) {
          return 'Nome deve ter pelo menos 3 caracteres';
        }
        break;
      case 'telefone':
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length < 10) {
          return 'Telefone inválido';
        }
        break;
      case 'endereco':
        if (value.trim().length < 10) {
          return 'Endereço deve ter pelo menos 10 caracteres';
        }
        break;
      case 'bairro':
        if (value.trim().length < 3) {
          return 'Bairro deve ter pelo menos 3 caracteres';
        }
        if (!bairroValidation.isValid && touched.bairro) {
          return 'Bairro não atendido';
        }
        break;
    }
    return undefined;
  };

  /**
   * Manipula mudança nos campos
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === 'telefone') {
      processedValue = applyPhoneMask(value);
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));

    if (touched[name]) {
      const error = validateField(name as keyof FormData, processedValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  /**
   * Manipula blur nos campos
   */
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    const error = validateField(name as keyof FormData, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  /**
   * Valida o formulário completo
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    newErrors.nome = validateField('nome', formData.nome);
    newErrors.telefone = validateField('telefone', formData.telefone);
    newErrors.endereco = validateField('endereco', formData.endereco);
    newErrors.bairro = validateField('bairro', formData.bairro);

    setErrors(newErrors);
    setTouched({
      nome: true,
      telefone: true,
      endereco: true,
      bairro: true,
    });

    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  /**
   * Submete o formulário e cria o pedido
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!bairroValidation.isValid) {
      setErrors((prev) => ({ ...prev, bairro: 'Bairro não atendido' }));
      return;
    }

    if (itens.length === 0) {
      alert('Carrinho vazio');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepara os itens do pedido
      const itensPedido: ItemPedidoDTO[] = itens.map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade,
        observacao: item.observacao,
      }));

      // Prepara os dados do pedido
      const dadosPedido: CriarPedidoDTO = {
        cliente: {
          nome: formData.nome,
          telefone: formData.telefone.replace(/\D/g, ''),
          endereco: formData.endereco,
          bairro: formData.bairro,
        },
        itens: itensPedido,
        observacao: formData.observacao || undefined,
      };

      // Cria o pedido na API
      const pedidoCriado = await pedidoService.criar(dadosPedido);

      // Limpa o carrinho
      limparCarrinho();

      // Verifica se há link de pagamento
      if (pedidoCriado.pagamentoId) {
        // Redireciona para o Asaas
        // Nota: O backend deve retornar a URL completa do pagamento
        // Por enquanto, vamos construir a URL baseada no pagamentoId
        const urlPagamento = `https://www.asaas.com/c/${pedidoCriado.pagamentoId}`;
        
        // Exibe mensagem de sucesso antes de redirecionar
        alert(`Pedido #${pedidoCriado.id} criado com sucesso! Você será redirecionado para o pagamento.`);
        
        // Redireciona para o pagamento
        window.location.href = urlPagamento;
      } else {
        // Se não houver pagamentoId, exibe mensagem de sucesso
        alert(`Pedido #${pedidoCriado.id} criado com sucesso!`);
        
        // Opcional: redirecionar para página de confirmação
        // window.location.href = `/pedido/${pedidoCriado.id}`;
      }
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      
      // Tratamento de erros específicos
      let errorMessage = 'Erro ao criar pedido. Tente novamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (itens.length === 0) {
    return (
      <div className="checkout">
        <div className="checkout__empty">
          <div className="checkout__empty-icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 className="checkout__empty-title">Carrinho vazio</h2>
          <p className="checkout__empty-message">
            Adicione produtos ao carrinho para continuar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <div className="checkout__container">
        <h1 className="checkout__title">Finalizar Pedido</h1>

        <form className="checkout__form" onSubmit={handleSubmit} noValidate>
          {/* Dados do Cliente */}
          <section className="checkout__section">
            <h2 className="checkout__section-title">Dados de Entrega</h2>

            <div className="checkout__field">
              <label htmlFor="nome" className="checkout__label">
                Nome completo *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                className={`checkout__input ${errors.nome && touched.nome ? 'checkout__input--error' : ''}`}
                value={formData.nome}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Seu nome completo"
                required
              />
              {errors.nome && touched.nome && (
                <span className="checkout__error">{errors.nome}</span>
              )}
            </div>

            <div className="checkout__field">
              <label htmlFor="telefone" className="checkout__label">
                Telefone *
              </label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                className={`checkout__input ${errors.telefone && touched.telefone ? 'checkout__input--error' : ''}`}
                value={formData.telefone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
              {errors.telefone && touched.telefone && (
                <span className="checkout__error">{errors.telefone}</span>
              )}
            </div>

            <div className="checkout__field">
              <label htmlFor="endereco" className="checkout__label">
                Endereço completo *
              </label>
              <input
                type="text"
                id="endereco"
                name="endereco"
                className={`checkout__input ${errors.endereco && touched.endereco ? 'checkout__input--error' : ''}`}
                value={formData.endereco}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Rua, número, complemento"
                required
              />
              {errors.endereco && touched.endereco && (
                <span className="checkout__error">{errors.endereco}</span>
              )}
            </div>

            <div className="checkout__field">
              <label htmlFor="bairro" className="checkout__label">
                Bairro *
              </label>
              <div className="checkout__input-wrapper">
                <input
                  type="text"
                  id="bairro"
                  name="bairro"
                  className={`checkout__input ${
                    errors.bairro && touched.bairro
                      ? 'checkout__input--error'
                      : bairroValidation.isValid
                      ? 'checkout__input--success'
                      : ''
                  }`}
                  value={formData.bairro}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Nome do bairro"
                  required
                />
                {bairroValidation.isValidating && (
                  <span className="checkout__input-icon checkout__input-icon--loading">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 12 12"
                          to="360 12 12"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </svg>
                  </span>
                )}
                {!bairroValidation.isValidating && bairroValidation.isValid && (
                  <span className="checkout__input-icon checkout__input-icon--success">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              {errors.bairro && touched.bairro && (
                <span className="checkout__error">{errors.bairro}</span>
              )}
              {bairroValidation.isValid && (
                <span className="checkout__success">
                  Taxa de entrega: {formatarPreco(bairroValidation.taxa)}
                </span>
              )}
            </div>

            <div className="checkout__field">
              <label htmlFor="observacao" className="checkout__label">
                Observações (opcional)
              </label>
              <textarea
                id="observacao"
                name="observacao"
                className="checkout__textarea"
                value={formData.observacao}
                onChange={handleChange}
                placeholder="Alguma observação sobre o pedido?"
                rows={3}
              />
            </div>
          </section>

          {/* Resumo do Pedido */}
          <section className="checkout__section">
            <h2 className="checkout__section-title">Resumo do Pedido</h2>

            <div className="checkout__summary">
              {/* Itens */}
              <div className="checkout__items">
                {itens.map((item) => (
                  <div key={item.produto.id} className="checkout__item">
                    <div className="checkout__item-info">
                      <span className="checkout__item-qty">{item.quantidade}x</span>
                      <span className="checkout__item-name">{item.produto.nome}</span>
                    </div>
                    <span className="checkout__item-price">
                      {formatarPreco(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="checkout__totals">
                <div className="checkout__total-row">
                  <span>Subtotal</span>
                  <span>{formatarPreco(subtotal)}</span>
                </div>
                <div className="checkout__total-row">
                  <span>Taxa de entrega</span>
                  <span>{taxaEntrega === 0 ? 'Grátis' : formatarPreco(taxaEntrega)}</span>
                </div>
                <div className="checkout__total-divider" />
                <div className="checkout__total-row checkout__total-row--final">
                  <span>Total</span>
                  <span>{formatarPreco(total)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Botão de Finalizar */}
          <button
            type="submit"
            className="checkout__submit"
            disabled={isSubmitting || !bairroValidation.isValid}
          >
            {isSubmitting ? 'Processando...' : 'Finalizar Pedido'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
