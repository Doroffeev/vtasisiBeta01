import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import VetOperations from './pages/VetOperations';
import Monitoring from './pages/Monitoring';
import Calvings from './pages/Calvings';
import HerdMovement from './pages/HerdMovement';
import Insemination from './pages/Insemination';
import PregnancyTest from './pages/PregnancyTest'; // Импорт новой страницы
import Reports from './pages/Reports';
import Medications from './pages/Medications';
import Employees from './pages/Employees';
import Admin from './pages/Admin';
import Presentation from './pages/Presentation';
import TreatmentSchemes from './components/TreatmentSchemes';
import Shipping from './pages/Shipping';
import PlannedOperations from './pages/PlannedOperations'; // Импорт страницы плановых операций
import LoadingScreen from './components/LoadingScreen';
import SupabaseSetup from './components/SupabaseSetup';
import { GroupsProvider } from './contexts/GroupsContext';
import { MovementsProvider } from './contexts/MovementsContext';
import { InseminationProvider } from './contexts/InseminationContext';
import { VetOperationsProvider } from './contexts/VetOperationsContext';
import { EmployeesProvider } from './contexts/EmployeesContext';
import { UserProvider, useUser, useAuthorization } from './contexts/UserContext';
import { MedicationsProvider } from './contexts/MedicationsContext';
import { NomenclatureProvider } from './contexts/NomenclatureContext';
import { BuyersProvider } from './contexts/BuyersContext';
import { ShipmentsProvider } from './contexts/ShipmentsContext';
import { FilterProvider } from './contexts/FilterContext';
import { PlannedOperationsProvider } from './contexts/PlannedOperationsContext'; // Добавляем провайдер
import { checkSupabaseConnection, supabase } from './lib/supabase';

const ProtectedRoute: React.FC<{
  path: string;
  element: React.ReactElement;
}> = ({ path, element }) => {
  const { currentUser } = useUser();
  const isAuthorized = useAuthorization(path);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return element;
};

function AppRoutes() {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return <LoadingScreen message="Проверка авторизации..." />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/presentation" element={<Presentation />} />
        <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" replace />} />
        
        <Route path="/" element={currentUser ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="animals" element={<ProtectedRoute path="/animals" element={<Animals />} />} />
          <Route path="vet-operations" element={<ProtectedRoute path="/vet-operations" element={<VetOperations />} />} />
          <Route path="monitoring" element={<ProtectedRoute path="/monitoring" element={<Monitoring />} />} />
          <Route path="treatment-schemes" element={<ProtectedRoute path="/treatment-schemes" element={<TreatmentSchemes />} />} />
          <Route path="calvings" element={<ProtectedRoute path="/calvings" element={<Calvings />} />} />
          <Route path="herd-movement" element={<ProtectedRoute path="/herd-movement" element={<HerdMovement />} />} />
          <Route path="insemination" element={<ProtectedRoute path="/insemination" element={<Insemination />} />} />
          <Route path="pregnancy-test" element={<ProtectedRoute path="/pregnancy-test" element={<PregnancyTest />} />} />
          <Route path="planned-operations" element={<ProtectedRoute path="/planned-operations" element={<PlannedOperations />} />} />
          <Route path="shipping" element={<ProtectedRoute path="/shipping" element={<Shipping />} />} />
          <Route path="reports" element={<ProtectedRoute path="/reports" element={<Reports />} />} />
          <Route path="medications" element={<ProtectedRoute path="/medications" element={<Medications />} />} />
          <Route path="employees" element={<ProtectedRoute path="/employees" element={<Employees />} />} />
          <Route path="admin" element={<ProtectedRoute path="/admin" element={<Admin />} />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const MAX_RETRIES = 2;

  // Оптимизация: используем useCallback для предотвращения лишних рендеров
  const checkConnection = useCallback(async () => {
    try {
      // Если supabase равен null, значит, нет настроек
      if (!supabase) {
        console.log('Supabase клиент не инициализирован, показываем форму настройки');
        setShowSetup(true);
        setIsConnecting(false);
        return;
      }
      
      try {
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.log('Проверка соединения с Supabase не удалась');
          // Если есть еще попытки, пробуем снова через секунду
          if (connectionRetries < MAX_RETRIES) {
            console.log(`Повторная попытка подключения (${connectionRetries + 1}/${MAX_RETRIES})...`);
            setConnectionRetries(prev => prev + 1);
            setTimeout(() => checkConnection(), 1000);
            return;
          }
          
          setConnectionError(true);
          setShowSetup(true);
        } else {
          console.log('Подключение к Supabase успешно установлено');
        }
      } catch (connectionError) {
        console.error('Ошибка во время проверки подключения:', connectionError);
        setConnectionError(true);
        setShowSetup(true);
      }
    } catch (error) {
      console.error('Непредвиденная ошибка при проверке подключения к Supabase:', error);
      setConnectionError(true);
      setShowSetup(true);
    } finally {
      setIsConnecting(false);
    }
  }, [connectionRetries]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  if (isConnecting) {
    return <LoadingScreen message="Подключение к базе данных..." />;
  }

  if (showSetup) {
    return <SupabaseSetup onSuccess={() => window.location.reload()} />;
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка подключения</h2>
          <p className="text-gray-700 mb-6">
            Не удалось подключиться к базе данных Supabase. Пожалуйста, проверьте настройки подключения 
            или нажмите кнопку ниже для настройки.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2 transition-colors"
            >
              Настроить Supabase
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Повторить попытку
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FilterProvider>
      <UserProvider>
        <EmployeesProvider>
          <NomenclatureProvider>
            <MedicationsProvider>
              <GroupsProvider>
                <MovementsProvider>
                  <InseminationProvider>
                    <VetOperationsProvider>
                      <BuyersProvider>
                        <ShipmentsProvider>
                          <PlannedOperationsProvider>
                            <AppRoutes />
                          </PlannedOperationsProvider>
                        </ShipmentsProvider>
                      </BuyersProvider>
                    </VetOperationsProvider>
                  </InseminationProvider>
                </MovementsProvider>
              </GroupsProvider>
            </MedicationsProvider>
          </NomenclatureProvider>
        </EmployeesProvider>
      </UserProvider>
    </FilterProvider>
  );
}

export default App;