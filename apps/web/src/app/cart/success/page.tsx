import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function OrderSuccessPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center min-h-screen">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Commande confirmée !</h1>
        <p className="text-muted-foreground mb-2">
          Votre commande a été passée avec succès. Vous recevrez une confirmation par email.
        </p>
        <p className="text-muted-foreground mb-8">
          Le fournisseur traitera votre commande dans les plus brefs délais.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard/orders">
            <Button>Voir mes commandes</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
