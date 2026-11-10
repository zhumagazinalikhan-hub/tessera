import { fromISO } from './dates';

// Built-in English word of the day, used until Context Cards decks are connected.
export interface Word {
  word: string;
  ipa: string;
  pos: string;
  meaning: string;
}

const W = (word: string, ipa: string, pos: string, meaning: string): Word => ({ word, ipa, pos, meaning });

export const WORDS: Word[] = [
  W('resilient', '/rɪˈzɪliənt/', 'adj', 'able to recover quickly after something difficult'),
  W('diligent', '/ˈdɪlɪdʒənt/', 'adj', 'careful and hard-working in what you do'),
  W('prioritise', '/praɪˈɒrɪtaɪz/', 'verb', 'to decide which things are most important and do them first'),
  W('consistent', '/kənˈsɪstənt/', 'adj', 'always behaving or performing in the same way'),
  W('deadline', '/ˈdedlaɪn/', 'noun', 'a time or date by which something must be finished'),
  W('procrastinate', '/prəˈkræstɪneɪt/', 'verb', 'to delay doing something you should do'),
  W('thrive', '/θraɪv/', 'verb', 'to grow, develop or succeed very well'),
  W('gratitude', '/ˈɡrætɪtjuːd/', 'noun', 'the feeling of being thankful'),
  W('humble', '/ˈhʌmbl/', 'adj', 'not proud; not thinking you are better than others'),
  W('endeavour', '/ɪnˈdevə/', 'noun', 'a serious attempt to do something'),
  W('steady', '/ˈstedi/', 'adj', 'developing gradually and regularly'),
  W('commitment', '/kəˈmɪtmənt/', 'noun', 'a promise to do something, or the will to keep doing it'),
  W('overwhelmed', '/ˌəʊvəˈwelmd/', 'adj', 'having too much to deal with'),
  W('incremental', '/ˌɪŋkrəˈmentl/', 'adj', 'growing in small steps over time'),
  W('perseverance', '/ˌpɜːsɪˈvɪərəns/', 'noun', 'continuing to try even when it is difficult'),
  W('mindful', '/ˈmaɪndfl/', 'adj', 'aware of what is happening now'),
  W('streamline', '/ˈstriːmlaɪn/', 'verb', 'to make a process simpler and more efficient'),
  W('delegate', '/ˈdelɪɡeɪt/', 'verb', 'to give part of your work to someone else'),
  W('feasible', '/ˈfiːzəbl/', 'adj', 'possible to do and likely to succeed'),
  W('sustainable', '/səˈsteɪnəbl/', 'adj', 'able to continue for a long time'),
  W('ambitious', '/æmˈbɪʃəs/', 'adj', 'having a strong wish to succeed'),
  W('meticulous', '/məˈtɪkjələs/', 'adj', 'very careful about every small detail'),
  W('momentum', '/məˈmentəm/', 'noun', 'the force that keeps something moving forward'),
  W('patience', '/ˈpeɪʃns/', 'noun', 'the ability to wait or continue calmly'),
  W('clarity', '/ˈklærəti/', 'noun', 'the quality of being clear and easy to understand'),
  W('reflect', '/rɪˈflekt/', 'verb', 'to think carefully about something'),
  W('accomplish', '/əˈkʌmplɪʃ/', 'verb', 'to succeed in doing something'),
  W('routine', '/ruːˈtiːn/', 'noun', 'the usual order in which you do things'),
  W('benchmark', '/ˈbentʃmɑːk/', 'noun', 'a standard used to measure other things'),
  W('versatile', '/ˈvɜːsətaɪl/', 'adj', 'able to do many different things well'),
  W('intention', '/ɪnˈtenʃn/', 'noun', 'something you plan to do'),
  W('eloquent', '/ˈeləkwənt/', 'adj', 'able to speak or write clearly and well'),
  W('ponder', '/ˈpɒndə/', 'verb', 'to think about something carefully for a long time'),
  W('vivid', '/ˈvɪvɪd/', 'adj', 'very clear, bright and detailed'),
  W('subtle', '/ˈsʌtl/', 'adj', 'not obvious; small but important'),
  W('candid', '/ˈkændɪd/', 'adj', 'honest and direct'),
  W('compelling', '/kəmˈpelɪŋ/', 'adj', 'so interesting or strong that you pay attention'),
  W('tedious', '/ˈtiːdiəs/', 'adj', 'long and boring'),
  W('crucial', '/ˈkruːʃl/', 'adj', 'extremely important'),
  W('adequate', '/ˈædɪkwət/', 'adj', 'good enough for a purpose'),
  W('allocate', '/ˈæləkeɪt/', 'verb', 'to give time or money for a particular purpose'),
  W('anticipate', '/ænˈtɪsɪpeɪt/', 'verb', 'to expect something and prepare for it'),
  W('coherent', '/kəʊˈhɪərənt/', 'adj', 'clear and logical'),
  W('constraint', '/kənˈstreɪnt/', 'noun', 'something that limits what you can do'),
  W('discipline', '/ˈdɪsəplɪn/', 'noun', 'the ability to control yourself and keep going'),
  W('evaluate', '/ɪˈvæljueɪt/', 'verb', 'to judge how good or important something is'),
  W('flourish', '/ˈflʌrɪʃ/', 'verb', 'to grow or develop successfully'),
  W('genuine', '/ˈdʒenjuɪn/', 'adj', 'real and sincere'),
  W('hinder', '/ˈhɪndə/', 'verb', 'to make something slower or more difficult'),
  W('insight', '/ˈɪnsaɪt/', 'noun', 'a clear understanding of something'),
  W('justify', '/ˈdʒʌstɪfaɪ/', 'verb', 'to give a good reason for something'),
  W('legitimate', '/lɪˈdʒɪtɪmət/', 'adj', 'fair, reasonable or allowed by law'),
  W('moderate', '/ˈmɒdərət/', 'adj', 'neither too much nor too little'),
  W('notion', '/ˈnəʊʃn/', 'noun', 'an idea or belief'),
  W('obstacle', '/ˈɒbstəkl/', 'noun', 'something that makes progress difficult'),
  W('persuade', '/pəˈsweɪd/', 'verb', 'to make someone agree by giving reasons'),
  W('relevant', '/ˈreləvənt/', 'adj', 'connected to what is being discussed'),
  W('significant', '/sɪɡˈnɪfɪkənt/', 'adj', 'large or important enough to notice'),
  W('tranquil', '/ˈtræŋkwɪl/', 'adj', 'calm and peaceful'),
  W('undertake', '/ˌʌndəˈteɪk/', 'verb', 'to accept a task and start doing it'),
];

export function wordFor(date: string): Word {
  const day = Math.floor(fromISO(date).getTime() / 86400000);
  return WORDS[((day % WORDS.length) + WORDS.length) % WORDS.length];
}
