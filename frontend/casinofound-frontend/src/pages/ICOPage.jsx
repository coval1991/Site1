import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  TrendingUp,
  Clock,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

import { useWeb3ModalProvider, useWeb3ModalAccount } from '@web3modal/ethers/react';
import { BrowserProvider, Contract, parseEther } from 'ethers';

import { apiClient } from '../lib/api';
import { formatNumber, formatCurrency } from '../lib/web3';

// Endereços e ABIs dos contratos (estes devem vir de um arquivo de configuração ou do backend)
const ICO_PHASE1_ADDRESS = '0x8008A571414ebAF2f965a5a8d34D78cEfa8BD8bD'; // Exemplo, use o real
const ICO_PHASE1_ABI = [
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "affiliate",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "payAffiliate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

const ICOPage = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();

  const [icoData, setIcoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [maticBalance, setMaticBalance] = useState('0');

  // Carregar dados da ICO
  useEffect(() => {
    loadICOData();
  }, []);

  // Carregar histórico de compras e saldo MATIC quando conectado
  useEffect(() => {
    if (isConnected && address) {
      loadPurchaseHistory();
      loadMaticBalance();
    }
  }, [isConnected, address]);

  const loadICOData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getICOStatus();
      if (response.success) {
        setIcoData(response.ico);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da ICO:', error);
      setError('Erro ao carregar dados da ICO');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      const response = await apiClient.getPurchaseHistory(address);
      if (response.success) {
        setPurchaseHistory(response.purchases);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadMaticBalance = async () => {
    if (!walletProvider || !address) return;
    try {
      const ethersProvider = new BrowserProvider(walletProvider);
      const balance = await ethersProvider.getBalance(address);
      setMaticBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Erro ao carregar saldo MATIC:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected || !walletProvider || !address) {
      setError('Conecte sua wallet primeiro');
      return;
    }

    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setError('Digite um valor válido');
      return;
    }

    const amount = parseFloat(purchaseAmount);
    const currentPhase = icoData?.currentPhase;

    if (!currentPhase) {
      setError('Nenhuma fase ativa encontrada');
      return;
    }

    if (amount < currentPhase.minPurchase) {
      setError(`Valor mínimo: ${currentPhase.minPurchase} MATIC`);
      return;
    }

    if (amount > currentPhase.maxPurchase) {
      setError(`Valor máximo: ${currentPhase.maxPurchase} MATIC`);
      return;
    }

    if (parseFloat(maticBalance) < amount) {
      setError('Saldo insuficiente de MATIC');
      return;
    }

    try {
      setPurchasing(true);
      setError('');
      setSuccess('');

      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();

      const icoContract = new Contract(ICO_PHASE1_ADDRESS, ICO_PHASE1_ABI, signer);

      // Converter o valor de compra para Wei
      const amountInWei = parseEther(amount.toString());

      // Se houver código de afiliado, use a função payAffiliate
      let tx;
      if (affiliateCode) {
        // Assumindo que payAffiliate espera o endereço do afiliado e o valor em MATIC
        // Você precisará ajustar esta chamada conforme a sua ABI real do contrato ICO
        // Por exemplo, se o contrato ICO tiver uma função buyTokensWithAffiliate(affiliateAddress, amount)
        tx = await icoContract.payAffiliate(affiliateCode, amountInWei, { value: amountInWei });
      } else {
        // Assumindo que o contrato ICO tem uma função de compra simples, por exemplo, buyTokens()
        // e que o valor é enviado como `value` na transação
        // Você precisará ajustar esta chamada conforme a sua ABI real do contrato ICO
        tx = await signer.sendTransaction({
          to: ICO_PHASE1_ADDRESS,
          value: amountInWei,
        });
      }
      
      await tx.wait(); // Esperar a transação ser minerada
      
      setSuccess(`Compra realizada com sucesso! Hash: ${tx.hash}`);
      setPurchaseAmount('');
      setAffiliateCode('');
      
      // Recarregar dados
      await loadICOData();
      await loadPurchaseHistory();
      await loadMaticBalance();

    } catch (error) {
      console.error('Erro na compra:', error);
      setError(error.message || 'Erro ao processar compra');
    } finally {
      setPurchasing(false);
    }
  };

  const calculateTokens = () => {
    if (!purchaseAmount || !icoData?.currentPhase) return 0;
    const amount = parseFloat(purchaseAmount);
    const price = icoData.currentPhase.tokenPrice;
    const tokens = amount / price;
    const bonus = tokens * (icoData.currentPhase.bonusPercentage / 100);
    return tokens + bonus;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados da ICO...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
          🚀 ICO Ativa
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold mb-4">
          Comprar Tokens CFD
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Participe da ICO do CasinoFound e comece a receber dividendos em USDT
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Formulário de Compra */}
        <div className="lg:col-span-2 space-y-6">
          {!isConnected ? (
            <Card>
              <CardHeader>
                <CardTitle>Conecte sua Wallet</CardTitle>
                <CardDescription>
                  Para comprar tokens CFD, você precisa conectar sua wallet MetaMask
                </CardDescription>
              </CardHeader>
              <CardContent>
                <w3m-button />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Comprar Tokens CFD
                </CardTitle>
                <CardDescription>
                  Fase {icoData?.currentPhase?.phase}: {icoData?.currentPhase?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Valor em MATIC</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      min={icoData?.currentPhase?.minPurchase}
                      max={icoData?.currentPhase?.maxPurchase}
                      step="0.01"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Saldo: {formatCurrency(maticBalance, 'MATIC')}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="affiliate">Código de Afiliado (Opcional)</Label>
                    <Input
                      id="affiliate"
                      placeholder="Digite o código"
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value)}
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      5% de desconto para o afiliado
                    </div>
                  </div>
                </div>

                {purchaseAmount && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {formatNumber(calculateTokens())}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tokens CFD
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-secondary">
                            ${icoData?.currentPhase?.tokenPrice}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Preço por Token
                          </div>
                        </div>
                      </div>
                      
                      {icoData?.currentPhase?.bonusPercentage > 0 && (
                        <div className="mt-4 text-center">
                          <Badge variant="secondary">
                            +{icoData.currentPhase.bonusPercentage}% Bônus
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handlePurchase}
                    disabled={purchasing || !purchaseAmount}
                    size="lg"
                    className="w-full"
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        Comprar Tokens CFD
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    Mín: {icoData?.currentPhase?.minPurchase} MATIC | 
                    Máx: {icoData?.currentPhase?.maxPurchase} MATIC
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Compras */}
          {isConnected && purchaseHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Compras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseHistory.slice(0, 5).map((purchase) => (
                    <div key={purchase._id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {formatNumber(purchase.tokensReceived)} CFD
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(purchase.amount, 'MATIC')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fase {purchase.icoPhase}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Informações da ICO */}
        <div className="space-y-6">
          {/* Progresso Atual */}
          {icoData?.currentPhase && (
            <Card>
              <CardHeader>
                <CardTitle>Progresso da Fase {icoData.currentPhase.phase}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Vendidos</span>
                    <span className="font-semibold">
                      {formatNumber(icoData.currentPhase.tokensSold)} / {formatNumber(icoData.currentPhase.totalTokens)}
                    </span>
                  </div>
                  <Progress value={icoData.currentPhase.progress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">
                      ${icoData.currentPhase.tokenPrice}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Preço Atual
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-secondary">
                      {icoData.currentPhase.bonusPercentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Bônus
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Todas as Fases */}
          <Card>
            <CardHeader>
              <CardTitle>Fases da ICO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {icoData?.phases?.map((phase) => (
                  <div 
                    key={phase.phase}
                    className={`p-3 rounded-lg border ${
                      phase.phase === icoData.currentPhase?.phase 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        Fase {phase.phase}
                      </span>
                      <Badge variant={
                        phase.isCompleted ? 'default' :
                        phase.isActive ? 'secondary' : 'outline'
                      }>
                        {phase.isCompleted ? 'Concluída' :
                         phase.isActive ? 'Ativa' : 'Aguardando'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${phase.tokenPrice} por token
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(phase.totalTokens)} tokens ({phase.percentageOfSupply}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Total Arrecadado</span>
                <span className="font-semibold">
                  {formatCurrency(icoData?.overall?.totalRaised || 0, 'MATIC')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tokens Vendidos</span>
                <span className="font-semibold">
                  {formatNumber(icoData?.overall?.totalTokensSold || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Progresso Geral</span>
                <span className="font-semibold">
                  {formatNumber(icoData?.overall?.overallProgress || 0, 1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Links Úteis */}
          <Card>
            <CardHeader>
              <CardTitle>Links Úteis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Contrato CFD no PolygonScan
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Whitepaper
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Telegram
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ICOPage;



