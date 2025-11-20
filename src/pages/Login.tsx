import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUsers, saveCurrentUser, initializeLocalStorage } from '@/utils/localStorage';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialiser localStorage au chargement
  useState(() => {
    initializeLocalStorage();
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      toast({
        title: 'Erreur de connexion',
        description: 'Email ou mot de passe incorrect',
        variant: 'destructive',
      });
      return;
    }

    if (!user.actif) {
      toast({
        title: 'Compte inactif',
        description: 'Votre compte n\'est pas encore activé',
        variant: 'destructive',
      });
      return;
    }

    saveCurrentUser(user);

    toast({
      title: 'Connexion réussie',
      description: `Bienvenue ${user.prenom} !`,
    });

    // Redirection selon le rôle
    switch (user.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'agent':
        navigate('/agent');
        break;
      case 'client':
        navigate('/client');
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">ImmoCRM</CardTitle>
            <CardDescription className="text-base">Immo-Rama.ch</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@example.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium text-center mb-3">Comptes de démonstration :</p>
            <div className="space-y-2 text-xs">
              <div>
                <p className="font-medium">Admin:</p>
                <p className="text-muted-foreground">admin@immo-rama.ch / admin123</p>
              </div>
              <div>
                <p className="font-medium">Agent:</p>
                <p className="text-muted-foreground">marc.dubois@immo-rama.ch / agent123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
