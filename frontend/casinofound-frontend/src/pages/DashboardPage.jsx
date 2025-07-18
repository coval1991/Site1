import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  Gift,
  History,
  Calculator,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import WalletConnect from '../components/WalletConnect';
import { useWeb3 } from '../hooks/useWeb3';
import { apiClient } from '../lib/api';
import { formatNumber, formatCurrency, formatAddress } from '../lib/web3';

const DashboardPage = () => {
  const { isConnected, account, balances, updateBalances } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [dividendInfo, setDividendInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [projection, setProjection] = useState(null);
  const [monthlyProfit, setMonthlyProfit] = useState('100000');
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isConnected && account) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [isConnected, account]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDividendInfo(),
        loadTransactions(),
        loadProjection(),
        updateBalances()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDividendInfo = async () => {
    try {
      const response = await apiClient.getDividendInfo(account);
      if (response.success) {
        setDividendInfo(response.dividendInfo);
      }
    } catch (error) {
      console.error('Erro ao carregar informações de dividendos:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await apiClient.getTransactions(account, 1, 10);
      if (response.success) {
        setTransactions(response.transactions);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const loadProjection = async () => {
    try {
      const response = await apiClient.calculateDividendProjection(account, parseFloat(monthlyProfit));
      if (response.success) {
        setProjection(response.projection);
      }
    } catch (error) {
      console.error('Erro ao calcular projeção:', error);
    }
  };

  const handleClaimDividends = async () => {
    if (!dividendInfo?.dividendHistory) return;

    const unclaimedDistributions = dividendInfo.dividendHistory
      .filter(d => !d.claimed)
      .map(d => d.distributionId);

    if (unclaimedDistributions.length === 0) {
      setError('Não há dividendos para reivindicar');
      return;
    }

    try {
      setClaiming(true);
      setError('');
      setSuccess('');

      const response = await apiClient.claimDividends(account, unclaimedDistributions);
      
      if (response.success) {
        setSuccess(`Dividendos reivindicados com sucesso! Total: ${response.totalClaimed.toFixed(6)} USDT`);
        await loadDividendInfo();
        await loadTransactions();
      }
    } catch (error) {
      console.error('Erro ao reivindicar dividendos:', error);
      setError(error.message || 'Erro ao reivindicar dividendos');
    } finally {
      setClaiming(false);
    }
  };

  const handleRefreshBalances = async () => {
    try {
      await updateBalances();
      await apiClient.refreshBalance(account);
      await loadDividendInfo();
      setSuccess('Saldos atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar saldos:', error);
      setError('Erro ao atualizar saldos');
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'ico_purchase':
        return <Gift className="h-4 w-4 text-primary" />;
      case 'dividend_payment':
        return <TrendingUp className="h-4 w-4 text-secondary" />;
      case 'affiliate_payment':
        return <Gift className="h-4 w-4 text-green-500" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'ico_purchase':
        return 'Compra ICO';
      case 'dividend_payment':
        return 'Dividendo';
      case 'affiliate_payment':
        return 'Comissão';
      default:
        return 'Transação';
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                Conecte sua wallet para acessar o dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnect />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dashboard...</span>
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
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {formatAddress(account)}
            </p>
          </div>
          <Button onClick={handleRefreshBalances} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Saldos
          </Button>
        </div>
      </motion.div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Cards de Saldo */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens CFD</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatNumber(parseFloat(balances.cfd))}
              </div>
              <p className="text-xs text-muted-foreground">
                {dividendInfo?.isEligibleForDividends ? (
                  <Badge variant="secondary" className="mt-1">
                    ✓ Elegível para dividendos
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1">
                    Aguardando 30 dias
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dividendos Disponíveis</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {formatNumber(dividendInfo?.availableDividends || 0, 6)} USDT
              </div>
              <p className="text-xs text-muted-foreground">
                Total recebido: {formatNumber(dividendInfo?.totalDividendsReceived || 0, 2)} USDT
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo de Posse</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dividendInfo?.holdingPeriodDays || 0} dias
              </div>
              <p className="text-xs text-muted-foreground">
                {dividendInfo?.holdingPeriodDays >= 30 ? 
                  'Elegível para dividendos' : 
                  `${30 - (dividendInfo?.holdingPeriodDays || 0)} dias restantes`
                }
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dividends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dividends">Dividendos</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="projection">Projeção</TabsTrigger>
        </TabsList>

        {/* Tab Dividendos */}
        <TabsContent value="dividends" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Reivindicar Dividendos */}
            <Card>
              <CardHeader>
                <CardTitle>Reivindicar Dividendos</CardTitle>
                <CardDescription>
                  Reivindique seus dividendos em USDT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dividendInfo?.availableDividends > 0 ? (
                  <>
                    <div className="text-center p-4 bg-secondary/10 rounded-lg">
                      <div className="text-3xl font-bold text-secondary mb-2">
                        {formatNumber(dividendInfo.availableDividends, 6)} USDT
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Disponível para reivindicar
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleClaimDividends}
                      disabled={claiming}
                      className="w-full"
                      size="lg"
                    >
                      {claiming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reivindicando...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Reivindicar Dividendos
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dividendo disponível</p>
                    <p className="text-sm">
                      {!dividendInfo?.isEligibleForDividends && 
                        'Você precisa manter os tokens por 30 dias'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Dividendos */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Dividendos</CardTitle>
              </CardHeader>
              <CardContent>
                {dividendInfo?.dividendHistory?.length > 0 ? (
                  <div className="space-y-3">
                    {dividendInfo.dividendHistory.slice(0, 5).map((dividend, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">
                            {formatNumber(dividend.amount, 6)} USDT
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(dividend.distributionDate).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <Badge variant={dividend.claimed ? 'default' : 'secondary'}>
                          {dividend.claimed ? 'Reivindicado' : 'Disponível'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum histórico de dividendos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Transações */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>
                Suas últimas transações na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <div className="font-medium">
                            {getTransactionLabel(tx.type)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString('pt-BR')} às {' '}
                            {new Date(tx.createdAt).toLocaleTimeString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatNumber(tx.amount)} {tx.currency}
                        </div>
                        <Badge variant={tx.status === 'confirmed' ? 'default' : 'secondary'}>
                          {tx.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Projeção */}
        <TabsContent value="projection" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calculadora */}
            <Card>
              <CardHeader>
                <CardTitle>Calculadora de Dividendos</CardTitle>
                <CardDescription>
                  Calcule seus dividendos futuros baseado no lucro mensal do casino
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="monthlyProfit">Lucro Mensal Estimado (USDT)</Label>
                  <Input
                    id="monthlyProfit"
                    type="number"
                    value={monthlyProfit}
                    onChange={(e) => setMonthlyProfit(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                
                <Button onClick={loadProjection} className="w-full">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Projeção
                </Button>
              </CardContent>
            </Card>

            {/* Resultados */}
            {projection && (
              <Card>
                <CardHeader>
                  <CardTitle>Projeção de Dividendos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {formatNumber(projection.projectedMonthlyDividend, 2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        USDT/mês
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary">
                        {formatNumber(projection.projectedYearlyDividend, 2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        USDT/ano
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Seus tokens CFD:</span>
                      <span className="font-medium">{formatNumber(projection.cfdBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Participação:</span>
                      <span className="font-medium">{formatNumber(projection.userSharePercentage, 4)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rendimento anual:</span>
                      <span className="font-medium">{formatNumber(projection.annualYieldPercentage, 2)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;

