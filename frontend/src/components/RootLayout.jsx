import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { motion, AnimatePresence } from 'motion/react';

export default function RootLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-ds-bg text-ds-text selection:bg-ds-accent selection:text-ds-bg flex flex-col dot-grid relative">
            <div className="noise-overlay fixed inset-0 pointer-events-none z-0" />

            <Navbar />

            <main className="flex-1 flex flex-col relative z-10 w-full">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{
                            duration: 0.2,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        className="flex-1 flex flex-col w-full"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <Footer />
        </div>
    );
}
