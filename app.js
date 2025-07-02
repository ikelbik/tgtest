// Инициализация приложения
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Элементы интерфейса
const initState = document.getElementById('init-state');
const connectedState = document.getElementById('connected-state');
const errorState = document.getElementById('error-state');
const walletAddress = document.getElementById('wallet-address');
const walletBalance = document.getElementById('wallet-balance');
const sendTrxBtn = document.getElementById('send-trx');
const disconnectBtn = document.getElementById('disconnect');
const retryBtn = document.getElementById('retry-connect');

// Инициализация TON Connect
const connector = new TonConnectSDK.TonConnect({
    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
    network: 'mainnet' // Используйте 'testnet' для тестов
});

// Подключение кошелька
async function connectWallet() {
    try {
        initState.classList.remove('hidden');
        connectedState.classList.add('hidden');
        errorState.classList.add('hidden');
        
        // Автоподключение TON Space внутри Telegram
        if (window.Telegram?.WebApp?.platform) {
            await connector.connect({ jsBridgeKey: 'tonwallet' });
        } else {
            console.log("Запущено вне Telegram");
            await connector.connect({
                universalLink: 'https://ton-connect.github.io/tonconnect-manifest/',
                bridgeUrl: 'https://bridge.tonapi.io/bridge'
            });
        }
    } catch (error) {
        console.error('Connection error:', error);
        showError();
    }
}

// Обработчик изменения статуса кошелька
connector.onStatusChange(wallet => {
    if (wallet) {
        showConnected(wallet);
        updateBalance(wallet.account.address);
    } else {
        connectWallet();
    }
});

// Показать подключенное состояние
function showConnected(wallet) {
    initState.classList.add('hidden');
    errorState.classList.add('hidden');
    connectedState.classList.remove('hidden');
    
    walletAddress.textContent = shortenAddress(wallet.account.address);
    walletBalance.textContent = 'загрузка...';
}

// Показать ошибку
function showError() {
    initState.classList.add('hidden');
    connectedState.classList.add('hidden');
    errorState.classList.remove('hidden');
}

// Обновить баланс
async function updateBalance(address) {
    try {
        // Используем TON API для получения баланса
        const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
        const data = await response.json();
        
        if (data.ok) {
            const balance = data.result / 1000000000; // nanoTON to TON
            walletBalance.textContent = `${balance.toFixed(3)} TON`;
        } else {
            walletBalance.textContent = 'ошибка';
        }
    } catch (error) {
        console.error('Balance error:', error);
        walletBalance.textContent = 'ошибка';
    }
}

// Отправить тестовую транзакцию
async function sendTransaction() {
    try {
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 мин
            messages: [
                {
                    // Тестовый адрес (замените на свой)
                    address: "EQDrjaMAd1uyVtVb1hECV3a23Kk7N9VepA5l5Ld4R__zqI2z",
                    amount: "1000000" // 0.001 TON (в нанотонах)
                }
            ]
        };

        const result = await connector.sendTransaction(transaction);
        Telegram.WebApp.showAlert(`Транзакция отправлена! BOC: ${result.boc}`);
    } catch (error) {
        console.error('Transaction error:', error);
        Telegram.WebApp.showAlert(`Ошибка: ${error.message}`);
    }
}

// Укороченный адрес для отображения
function shortenAddress(address) {
    return address.substring(0, 6) + '...' + address.substring(address.length - 6);
}

// Обработчики кнопок
sendTrxBtn.addEventListener('click', sendTransaction);
disconnectBtn.addEventListener('click', () => connector.disconnect());
retryBtn.addEventListener('click', connectWallet);

// Инициализация при загрузке
if (connector.wallet) {
    showConnected(connector.wallet);
    updateBalance(connector.wallet.account.address);
} else {
    connectWallet();
}