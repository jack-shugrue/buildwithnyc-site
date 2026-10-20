import { createRoot } from 'react-dom/client';
import '@nycopportunity/tokens/fonts.css';
import '@nycopportunity/tokens/tokens.css';
import '@nycopportunity/react/nyco.css';
import './styles.css';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);
