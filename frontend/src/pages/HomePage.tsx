import { Link } from 'react-router-dom';
import SkipLink from '../components/SkipLink';

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <div className="h-screen flex items-center justify-center bg-white px-4 overflow-hidden">
        <main id="main-content" className="text-center max-w-xl">
          <h1 className="text-5xl font-semibold text-[#1d1d1f] tracking-tight leading-tight">
            Chatbot Telemetry
          </h1>
          <p className="mt-4 text-lg text-[#6e6e73]">
            Converse, analise e entenda seus dados em tempo real.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2"
            >
              Criar conta
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
