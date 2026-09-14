import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/IdiomaContext';
import { brainService, BrainMessage, newMessageId } from '../services/brainService';
import { uploadCreatorImage } from '../services/creatorUploads';
import { creditsShortfall, CreditsShortfall } from '../services/creditsService';
import { BrainQuote } from '../services/brainService';
import { humanizeCreatorError } from '../services/creatorService';

const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Una conversación con Weë Brain: mensajes en tiempo real desde Firestore,
 * envío con foto adjunta y búsqueda web opcional, y errores en lenguaje humano.
 * Si hay una conversación de las últimas 24 horas, se retoma con su contexto.
 */
export const useBrainChat = () => {
  const { user } = useAuth();
  const t = useT();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BrainMessage[]>([]);
  const [pending, setPending] = useState<BrainMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortfall, setShortfall] = useState<CreditsShortfall | null>(null);
  // Precio del próximo mensaje: lo calcula el servidor con el mismo mecanismo
  // que usará para cobrar, y se enseña antes de que la persona pulse enviar.
  const [quote, setQuote] = useState<BrainQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const resumed = useRef(false);
  const quoteRun = useRef(0);

  // Retomar la última conversación reciente
  useEffect(() => {
    if (!user || resumed.current) return;
    resumed.current = true;
    brainService
      .getLatestChat(user.uid)
      .then((chat) => {
        if (!chat) return;
        const updated = chat.updatedAt?.toDate ? chat.updatedAt.toDate().getTime() : 0;
        if (Date.now() - updated < RESUME_WINDOW_MS) setChatId(chat.id);
      })
      .catch((e) => console.warn('Weë Brain: no se pudo retomar la conversación:', e));
  }, [user]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    return brainService.subscribeToMessages(chatId, setMessages);
  }, [chatId]);

  /**
   * Pide al servidor cuánto costará el mensaje tal y como está ahora. Se llama
   * cada vez que cambia lo que la persona escribió o adjuntó, para que el precio
   * de la pantalla siempre corresponda al contenido actual.
   */
  const refreshQuote = useCallback(
    async (text: string, options: { imageUri?: string | null; webSearch?: boolean } = {}) => {
      const message = text.trim();
      if (!user || !message) {
        setQuote(null);
        setQuoteError(null);
        return;
      }
      const run = ++quoteRun.current;
      setQuoting(true);
      setQuoteError(null);
      try {
        const next = await brainService.quote({
          chatId: chatId || undefined,
          message,
          webSearch: options.webSearch === true,
        });
        if (run !== quoteRun.current) return;
        setQuote(next);
      } catch (e) {
        if (run !== quoteRun.current) return;
        setQuote(null);
        setQuoteError(t('weeai.couldNotCalculateRetry'));
      } finally {
        if (run === quoteRun.current) setQuoting(false);
      }
    },
    [user, chatId]
  );

  const send = useCallback(
    async (text: string, options: { imageUri?: string | null; webSearch?: boolean } = {}): Promise<boolean> => {
      const message = text.trim();
      if (!user || !message || busy) return false;
      setBusy(true);
      setError(null);
      setShortfall(null);
      const messageId = newMessageId();
      setPending({ id: messageId, role: 'user', text: message, imageUrl: options.imageUri || undefined, createdAt: null });
      try {
        let imageUrl: string | undefined;
        if (options.imageUri) {
          setUploading(true);
          imageUrl = await uploadCreatorImage(user.uid, options.imageUri, 'brain-attachments');
          setUploading(false);
        }
        const reply = await brainService.send({ chatId: chatId || undefined, message, messageId, imageUrl, webSearch: options.webSearch === true });
        if (!chatId) setChatId(reply.chatId);
        return true;
      } catch (e) {
        const short = creditsShortfall(e);
        setShortfall(short);
        if (!short) setError(humanizeCreatorError(e, t));
        return false;
      } finally {
        setUploading(false);
        setPending(null);
        setBusy(false);
      }
    },
    [user, chatId, busy]
  );

  const reset = useCallback(() => {
    setChatId(null);
    setMessages([]);
    setPending(null);
    setError(null);
    setShortfall(null);
  }, []);

  const visible = pending && !messages.some((m) => m.id === pending.id) ? [...messages, pending] : messages;

  return { user, chatId, messages: visible, busy, uploading, error, shortfall, quote, quoting, quoteError, refreshQuote, send, reset };
};
