import { useState } from "react";
import { CreditCard, QrCode, Loader2, CheckCircle2, Copy, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  price: number;
  type: string;
}

const PaymentModal = ({ open, onOpenChange, planName, price, type }: PaymentModalProps) => {
  const { toast } = useToast();
  const [method, setMethod] = useState<"card" | "pix">("card");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiry: "", cvv: "" });

  const pixCode = "00020126580014br.gov.bcb.pix0136coworking013-praia-grande5204000053039865802BR5925COWORKING 013 LTDA6012PRAIA GRANDE62070503***6304";

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleCardPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 2500);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    toast({ title: "Código PIX copiado!", description: "Cole no app do seu banco para pagar." });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccess(false);
      setMethod("card");
      setCardForm({ number: "", name: "", expiry: "", cvv: "" });
    }, 300);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="font-heading font-bold text-2xl text-foreground mb-2">Pagamento Confirmado!</h3>
            <p className="text-muted-foreground mb-1">{planName} — {type}</p>
            <p className="font-heading font-bold text-xl text-primary mb-6">
              R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Você receberá um e-mail com os detalhes da sua reserva.
            </p>
            <Button onClick={handleClose} className="bg-primary text-primary-foreground hover:bg-brand-orange-light font-heading font-bold rounded-full px-8">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-xl">Pagamento</DialogTitle>
        </DialogHeader>

        {/* Plan summary */}
        <div className="bg-muted rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="font-heading font-bold text-foreground">{planName}</p>
            <p className="text-sm text-muted-foreground">{type}</p>
          </div>
          <p className="font-heading font-black text-2xl text-primary">
            R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod("card")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-heading font-bold transition-all ${
              method === "card"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Cartão de Crédito
          </button>
          <button
            onClick={() => setMethod("pix")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-heading font-bold transition-all ${
              method === "pix"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <QrCode className="w-4 h-4" />
            PIX
          </button>
        </div>

        {/* Card form */}
        {method === "card" && (
          <form onSubmit={handleCardPayment} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Número do cartão</Label>
              <Input
                placeholder="0000 0000 0000 0000"
                value={cardForm.number}
                onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                maxLength={19}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Nome no cartão</Label>
              <Input
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                value={cardForm.name}
                onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Validade</Label>
                <Input
                  placeholder="MM/AA"
                  value={cardForm.expiry}
                  onChange={(e) => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">CVV</Label>
                <Input
                  placeholder="123"
                  value={cardForm.cvv}
                  onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-brand-orange-light font-heading font-bold rounded-full py-6 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Pagar R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Pagamento seguro processado via Stripe
            </p>
          </form>
        )}

        {/* PIX */}
        {method === "pix" && (
          <div className="text-center space-y-4">
            <div className="bg-white rounded-xl p-6 inline-block mx-auto border-2 border-muted">
              {/* Simulated QR code */}
              <div className="w-48 h-48 mx-auto grid grid-cols-8 gap-0.5">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full aspect-square rounded-sm ${
                      Math.random() > 0.4 ? "bg-foreground" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code ou copie o código abaixo
            </p>
            <div className="bg-muted rounded-xl p-3 flex items-center gap-2">
              <code className="text-xs flex-1 truncate text-foreground">{pixCode.slice(0, 50)}...</code>
              <Button
                onClick={handleCopyPix}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </Button>
            </div>
            <Button
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  setSuccess(true);
                }, 3000);
              }}
              disabled={loading}
              className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 font-heading font-bold rounded-full py-6 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Aguardando pagamento...
                </>
              ) : (
                "Já realizei o pagamento"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              O PIX expira em 30 minutos
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
