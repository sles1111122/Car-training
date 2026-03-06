import JaywalkingScenario from './scenarios/Jaywalking.js';
import TruckTurnScenario from './scenarios/TruckTurn.js';
import AmbulanceScenario from './scenarios/Ambulance.js'; 
import ConstructionSystem from './scenarios/ConstructionSystem.js'; 
import PhoneScenario from './scenarios/PhoneScenario.js';
import RoadSignScenario from './scenarios/RoadSignScenario.js';

export class ScenarioManager {
    constructor(scene, camera, gameManager, sceneData,dataCollector) { 
        this.scene = scene;
        this.camera = camera;
        this.gameManager = gameManager;
        this.dataCollector = dataCollector; // 保存獨立的實例
        const bounds = sceneData.bounds || null;
        //將所有事件匯入管理器
        this.scenarios = [
            new JaywalkingScenario(),      
            new TruckTurnScenario(sceneData.intersections, sceneData.pedestrians, bounds), 
            new AmbulanceScenario(sceneData.intersections, sceneData.pedestrians, bounds), 
            new ConstructionSystem(),
            new PhoneScenario(),
            new RoadSignScenario()       
        ];

        this.currentScenario = null;
        this.cooldown = 5000; 
        this.lastTriggerTime = Date.now();
        this.setupDebugKeys();
    }

    setupDebugKeys() {
        window.addEventListener('keydown', (e) => {
            // 1. 強制停止 (ESC)
            if (e.key === 'Escape' && this.currentScenario) {
                this.currentScenario.stop(this.scene);
                this.currentScenario = null;
                this.lastTriggerTime = Date.now();
                console.log("🛑 事件強制停止");
                return;
            }

            // 防止重複觸發
            if (this.currentScenario) return;

            // 2. 按鍵觸發 (統一呼叫 activateScenario)
            const key = e.key.toLowerCase();
            
            if (key === 'b') {
                this.activateScenario(this.scenarios[5]);
            }
            if (key === 'v') {
                this.activateScenario(this.scenarios[4]);
            }
            if (key === 'x') {
                // 觸發施工 (index 3)
                this.activateScenario(this.scenarios[3]);
            }
            else if (key === 'q') {
                // 觸發救護車 (index 2)
                this.activateScenario(this.scenarios[2]);
            }
            else if (key === 'w') {
                // 觸發卡車 (index 1)
                this.activateScenario(this.scenarios[1]);
            }
            // 你也可以加個 'e' 測試行人
            else if (key === 'e') {
                this.activateScenario(this.scenarios[0]);
            }
        });
    }

update(dt, currentNSState, currentEWState) {
        if (this.currentScenario) {
            // 執行當前事件的 update
            const isFinished = this.currentScenario.update(dt, currentNSState, currentEWState, this.camera);
            
            // 如果事件回傳 true (代表結束了)
            if (isFinished) {
                this.currentScenario.stop(this.scene);
                this.currentScenario = null;
                this.lastTriggerTime = Date.now();
                
                // ★ 新增：呼叫 GameManager 解除無敵星星狀態！
                if (this.gameManager && typeof this.gameManager.recordEventEnd === 'function') {
                    this.gameManager.recordEventEnd();
                }
                
                if (this.dataCollector) {
                    this.dataCollector.recordMiss(); // 確保計時器歸零並結算
                }
            }
            return;
        }

        // 冷卻時間過後，隨機觸發
        if (Date.now() - this.lastTriggerTime > this.cooldown) {
            this.triggerRandom();
        }
    }

    //觸發隨機事件
    triggerRandom() {
        const randomIndex = Math.floor(Math.random() * this.scenarios.length);
        const scenario = this.scenarios[randomIndex];
        
        console.log(`🎲 隨機觸發: ${scenario.name}`);
        this.activateScenario(scenario);
    }

    // ★★★ 核心方法：統一處理啟動與 DataCollector 連動 ★★★
activateScenario(scenario) {
        this.currentScenario = scenario;
        this.currentScenario.start(this.scene, this.camera, this.gameManager);
        this.lastTriggerTime = Date.now();
        
        // ★ 新增：建立事件代號對應表 (讓 Scenario 的名稱對應到 GameManager 的 key)
        const typeMap = {
            'JaywalkingScenario': 'pedestrian',
            'TruckTurnScenario': 'truck',
            'AmbulanceScenario': 'ambulance',
            'ConstructionSystem': 'construction',
            'PhoneScenario': 'phone',
            'RoadSignScenario': 'traffic_light'
        };
        
        const className = scenario.constructor.name;
        // 取得對應的代號，如果找不到預設為 pedestrian
        this.currentEventType = typeMap[className] || 'pedestrian'; 

        // ★ 新增：通知 GameManager 事件開始！(開啟無敵星星 + 次數加 1)
        if (this.gameManager && typeof this.gameManager.recordEventStart === 'function') {
            this.gameManager.recordEventStart(this.currentEventType);
        }
        
        // --- 以下維持你原本的 DataCollector 邏輯 ---
        const eventName = scenario.name || className;
        if (this.dataCollector) {
            this.dataCollector.recordEventTrigger(eventName);
            console.log(`📝 已記錄事件：${eventName}`);
            
            if (scenario.hasReactionTest) {
                console.log(`⚡ [Manager] 啟動反應計時: ${eventName}`);
                this.dataCollector.startTimer();
            }
        }
    }
}