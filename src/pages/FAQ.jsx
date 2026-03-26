import { useState } from 'react';

const faqs = [
  {
    q: 'Is TraX real money?',
    a: 'No. TraX uses a virtual currency called ₮ (TraX Tokens). Every new user starts with ₮10,000. There is no real money involved whatsoever.'
  },
  {
    q: 'How does trading work?',
    a: 'TraX uses a real order book matching engine. When you place a Market order, it instantly matches with the best available price. Limit orders sit on the book until matched. Stop Loss orders trigger when the price hits your target.'
  },
  {
    q: 'What are the order types?',
    a: 'Market: Buy/sell immediately at the current best price. Limit: Set a specific price — your order waits on the book until matched. Stop Loss: Automatically sell when the price drops to your target to limit losses.'
  },
  {
    q: 'How do asset prices move?',
    a: 'Prices are driven by real supply and demand on the order book. AI market-making bots also provide continuous liquidity and natural price movement, simulating a realistic market environment.'
  },
  {
    q: 'How do I propose a new asset?',
    a: 'Go to the Propose page, fill in the details (name, ticker, category, description, IPO price, supply), and submit. If your proposal gets 50 community votes, it automatically goes live on the exchange!'
  },
  {
    q: 'What is the leaderboard?',
    a: 'The leaderboard ranks all traders by their total net worth (balance + portfolio value). Trade smart and climb to the top!'
  },
  {
    q: 'Can I lose all my money?',
    a: 'In theory, yes — if all your holdings drop to zero. But since it\'s virtual currency, there\'s no real financial risk. It\'s a safe environment to learn trading.'
  },
  {
    q: 'What are the asset categories?',
    a: 'Physical: Real-world items (matchsticks, sneakers, etc.). Commodity: Raw materials and resources. Meme Stock: Internet culture and viral items.'
  },
  {
    q: 'Is there an API?',
    a: 'TraX currently doesn\'t offer a public API. All trading is done through the web interface. We may consider adding API access in the future.'
  },
  {
    q: 'How do I reset my account?',
    a: 'Currently, account reset is not available. You start with ₮10,000 and your journey begins from there — just like real markets, you learn by doing!'
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in py-4">
        <div className="text-center space-y-3">
            <h1 className="font-serif text-4xl tracking-tight text-[#f0ebe0]">FAQ</h1>
            <p className="text-[#8a8580] text-sm">Everything you need to know about TraX.</p>
        </div>

        <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden transition-all hover:border-[#2a2a2a]">
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="w-full flex justify-between items-center p-5 text-left"
                  >
                      <span className="text-sm text-[#f0ebe0] font-medium pr-4">{faq.q}</span>
                      <iconify-icon
                        icon="solar:alt-arrow-down-linear"
                        class={`text-[#8a8580] text-lg shrink-0 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`}
                      ></iconify-icon>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openIdx === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                      <p className="text-sm text-[#8a8580] leading-relaxed px-5">{faq.a}</p>
                  </div>
              </div>
            ))}
        </div>
    </div>
  );
}
