// Основные элементы интерфейса
const initState = document.getElementById('init-state');
const connectedState = document.getElementById('connected-state');
const errorState = document.getElementById('error-state');
const walletAddress = document.getElementById('wallet-address');
const walletBalance = document.getElementById('wallet-balance');
const walletNetwork = document.getElementById('wallet-network');
const walletStatus = document.getElementById('wallet-status');
const errorMessage = document.getElementById('error-message');
const sendTrxBtn = document.getElementById('send-trx');
const disconnectBtn = document.getElementById('disconnect');
const retryBtn = document.getElementById('retry-connect');

// Глобальные переменные
let connector = null;
let currentNetwork = 'testnet'; // 'mainnet' для продакшена

// Проверка окружения Telegram
if (!window.Telegram || !window.Telegram.WebApp) {
    showError("Приложение запущено вне Telegram");
} else {
    // Инициализация WebApp
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    Telegram.WebApp.MainButton.hide();
}

// Инициализация приложения
async function initApp() {
    try {
        showState('init');
        
        // Проверка поддержки TON Space
        if (!isTonSpaceSupported()) {
            throw new Error('TON Space не доступен. Обновите Telegram и активируйте кошелек через @wallet');
        }
        
        // Создаем коннектор
        connector = new TonConnectSDK.TonConnect({
            manifestUrl: window.location.origin + '/tonconnect-manifest.json',
            network: currentNetwork
        });
        
        // Обработчик изменения статуса кошелька
        connector.onStatusChange(handleWalletStatusChange);
        
        // Автоподключение при запуске
        await connectWallet();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`Ошибка инициализации: ${error.message}`);
    }
}

// Проверка поддержки TON Space (исправленная)
function isTonSpaceSupported() {
    try {
        // Основная проверка для последних версий Telegram
        if (window.Telegram.WebApp.isVersionAtLeast('7.2') && window.ton && window.ton.isTonWallet) {
            return true;
        }
        
        // Альтернативная проверка для версий 6.9+
        if (window.Telegram.WebApp.isVersionAtLeast('6.9') && window.ton) {
            return true;
        }
        
        return false;
    } catch (e) {
        console.error('TON Space check error:', e);
        return false;
    }
}

// Подключение кошелька (исправленная)
async function connectWallet() {
    try {
        showState('init');
        walletStatus.textContent = 'Подключение...';
        
        // Если коннектор не инициализирован
        if (!connector) {
            throw new Error('Коннектор не инициализирован');
        }
        
        // Проверка, подключен ли уже кошелек
        const isConnected = await new Promise((resolve) => {
            setTimeout(() => {
                resolve(connector.connected);
            }, 100);
        });
        
        if (isConnected) {
            handleWalletStatusChange(connector.wallet);
            return;
        }
        
        // Подключение внутри Telegram
        if (window.Telegram?.WebApp?.platform) {
            await connector.connect({
                jsBridgeKey: 'tonwallet',
                timeout: 10000 // 10 секунд таймаут
            });
        } 
        // Подключение вне Telegram (для тестов)
        else {
            await connector.connect({
                universalLink: 'https://ton-connect.github.io/tonconnect-manifest/',
                bridgeUrl: 'https://bridge.tonapi.io/bridge'
            });
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        showError(`Ошибка подключения: ${error.message}`);
    }
}

// Обработчик изменения статуса кошелька
function handleWalletStatusChange(wallet) {
    try {
        if (wallet) {
            showConnected(wallet);
            updateWalletInfo(wallet);
        } else {
            walletStatus.textContent = 'Отключен';
            showState('init');
            connectWallet();
        }
    } catch (e) {
        showError(`Status error: ${e.message}`);
    }
}

// Отображение подключенного состояния
function showConnected(wallet) {
    showState('connected');
    walletStatus.textContent = 'Подключен';
}

// Обновление информации о кошельке
async function updateWalletInfo(wallet) {
    try {
        walletAddress.textContent = shortenAddress(wallet.account.address);
        walletNetwork.textContent = wallet.account.chain === '-239' ? 'Основная' : 'Тестовая';
        
        // Получение баланса
        const balance = await fetchWalletBalance(wallet.account.address);
        walletBalance.textContent = `${balance} TON`;
    } catch (error) {
        console.error('Wallet info error:', error);
        walletBalance.textContent = 'Ошибка загрузки';
    }
}

// Получение баланса кошелька
async function fetchWalletBalance(address) {
    try {
        // Используем разные API для testnet/mainnet
        const apiUrl = currentNetwork === 'testnet' 
            ? `https://testnet.tonapi.io/v1/account/getInfo?account=${address}`
            : `https://tonapi.io/v1/account/getInfo?account=${address}`;
        
        const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
        
        // Конвертация из нанотоннов
        const balanceNano = data.balance || 0;
        const balanceTon = (parseInt(balanceNano) / 1000000000).toFixed(3);
        return balanceTon;
    } catch (error) {
        throw new Error(`Не удалось получить баланс: ${error.message}`);
    }
}

// Отправка тестовой транзакции
async function sendTestTransaction() {
    try {
        // Временно блокируем кнопку
        sendTrxBtn.disabled = true;
        sendTrxBtn.textContent = 'Подготовка транзакции...';
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 мин
            messages: [
                {
                    // Тестовый адрес для testnet
                    address: currentNetwork === 'testnet' 
                        ? "EQDrjaMAd1uyVtVb1hECV3a23Kk7N9VepA5l5Ld4R__zqI2z"
                        : "EQAkAJmZk7B2dRZZ1sNnN7rQe6Jj7G2tUqyTZ7L3qS1vXW0", // mainnet
                    amount: "1000000" // 0.001 TON (в нанотонах)
                }
            ]
        };

        const result = await connector.sendTransaction(transaction);
        
        Telegram.WebApp.showAlert(`✅ Транзакция отправлена!\nХэш: ${result.boc.slice(0, 12)}...`);
        
    } catch (error) {
        console.error('Transaction error:', error);
        Telegram.WebApp.showAlert(`❌ Ошибка транзакции: ${error.message}`);
    } finally {
        sendTrxBtn.disabled = false;
        sendTrxBtn.textContent = 'Отправить 0.001 TON';
    }
}

// Отключение кошелька
function disconnectWallet() {
    if (connector) {
        connector.disconnect();
        showState('init');
    }
}

// Укороченный адрес для отображения
function shortenAddress(address, start = 6, end = 4) {
    return address.length > start + end 
        ? `${address.substring(0, start)}...${address.substring(address.length - end)}` 
        : address;
}

// Управление состояниями интерфейса
function showState(state) {
    initState.classList.toggle('hidden', state !== 'init');
    connectedState.classList.toggle('hidden', state !== 'connected');
    errorState.classList.toggle('hidden', state !== 'error');
}

// Отображение ошибки
function showError(message) {
    showState('error');
    errorMessage.textContent = message;
}

// Инициализация обработчиков событий
function setupEventListeners() {
    sendTrxBtn.addEventListener('click', sendTestTransaction);
    disconnectBtn.addEventListener('click', disconnectWallet);
    retryBtn.addEventListener('click', () => {
        showState('init');
        connectWallet();
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initApp();
});