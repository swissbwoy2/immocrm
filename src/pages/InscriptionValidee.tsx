import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react';
import { PremiumAuthLayout, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { motion } from 'framer-motion';

const InscriptionValidee = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <PremiumAuthLayout
      title="Demande enregistrée !"
      description="Votre agent Logisorama va analyser votre recherche et vous contacter rapidement"
      backTo="/"
      badge="Confirmation"
    >
      <div className="space-y-5">
        {/* Success icon */}
        <div className="flex justify-center">
          <motion.div
            className="relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500/10 blur-xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>

        {/* Info card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3"
        >
          <Sparkles className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Un email de confirmation vous a été envoyé. Gardez un œil sur votre boîte de réception pour accéder à votre espace client.
          </p>
        </motion.div>

        {/* CTA */}
        <AuthSubmitButton animDelay={0.5} onClick={() => navigate('/login')} type="button">
          Accéder à mon espace
        </AuthSubmitButton>

        {/* Countdown */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground"
        >
          Redirection automatique dans{' '}
          <span className="text-primary font-semibold tabular-nums">{countdown}</span>{' '}
          seconde{countdown > 1 ? 's' : ''}…
        </motion.p>
      </div>
    </PremiumAuthLayout>
  );
};

export default InscriptionValidee;
