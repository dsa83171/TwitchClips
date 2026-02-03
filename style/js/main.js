const app = Vue.createApp({
    data(){
        return {
            token:"",
            apiUrl:"",
            urls:[],
            clips:[],
            diff_ids:[],
            isDarkTheme: true,
            showPlayer: false,
            currentEmbedUrl: '',
            showHelp: false,
            sheetId:"",
            sortKey: 'created_at', //預設篩選
            sortOrder: 'desc', 
            name: '',
        };
    },
    created() {
        const storedTheme = localStorage.getItem("theme");
        if(storedTheme != null){
            this.isDarkTheme = storedTheme === "dark-theme";
        }
        this.applyTheme();
    },
    mounted(){
        this.getTitleName();
        this.getClips();
        this.checkDiff();
    },
    methods:{
        getTitleName(){
            var getUrlString = location.href;
            var url = new URL(getUrlString);
            this.name = url.searchParams.get('name');
            if(this.name == null){
                this.name = '阿痕 - Twitch剪輯';
            }
        },
        // 切換主題
        toggleTheme() {
            const theme = this.isDarkTheme ? "dark-theme" : "light-theme";
            localStorage.setItem("theme", theme);
            this.applyTheme();
        },
        // 切換主題
        applyTheme() {
            const theme = this.isDarkTheme ? "dark-theme" : "light-theme";
            document.body.className = theme;
          
            // 換開關圓球上的 emoji
            this.$nextTick(() => {
                const sliderParent = document.querySelector(".slider-icon");
                if (sliderParent) {
                    sliderParent.setAttribute("data-icon", this.isDarkTheme ? "🌙" : "☀️");
                }
            });
        },
        // 取得自定義sheetid
        getSheetId(){
            var getUrlString = location.href;
            var url = new URL(getUrlString);
            this.sheetId = url.searchParams.get('id');
        },
        // 取得Sheet的json
        async getListFromSheet(){
            this.getSheetId();
            var sheetAPI = "https://script.google.com/macros/s/AKfycbxjZUSlhqsKKoLcI3596cQZ8fPYvHnfCJft7Lk2oddMpZWZ902vf5o4saQgHSgnPLtjnQ/exec?action=getclips";
            if (this.sheetId != null){
                sheetAPI = sheetAPI+"&sheetid="+this.sheetId;
            }
            var res = await axios.get(sheetAPI);
            this.urls = res.data;
        },
        // 取得Twitch token
        async getToken(){
            var res = await axios.post('https://id.twitch.tv/oauth2/token', new URLSearchParams({
                client_id: '2hcw7jubxmk94gkrzhao4wbznzobjv',
                client_secret: 'mz71nl4tw9a9hw2rjz8mpowm38c1hv',
                grant_type: 'client_credentials'
              }), {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              });
           console.log(res.data);
           this.token = res.data.access_token;
        },
        //取得剪輯
        async getClips(){
            try {
                const res = await axios.get('https://api-server.dsa83171.workers.dev/api/clips');
                this.clips = res.data;
            } catch (error) {
                console.error("抓取剪輯失敗:", error);
            }
        },
        //取得CFDB的所有剪輯資料
        async checkDiff(){
            await this.getListFromSheet();
            // 取得google sheet 清單中的剪輯ID
            const ids = this.urls.map(item => {
                const url = item[0];
                const match = url.match(/(?:clip\/|clips\.twitch\.tv\/)([^/?]+)/);
                return match ? match[1] : null;
            }).filter(id => id);

            // 取得CFDB的所有剪輯ID
            const clips_ids = await this.getCFDB_IDs();

            // 比對差異ID
            const existingIdsSet = new Set(clips_ids.map(item => item.id));
            this.diff_ids = ids.filter(id => !existingIdsSet.has(id));
            console.log("差異ID:", this.diff_ids);
            //有差異就去抓Twitch剪輯資料
            if(this.diff_ids.length > 0){
                await this.getTwitchClip();
                await this.getClips();
            }
        },
        async getTwitchClip(){
            await this.getToken();
            let twitchClipsApiUrl = `https://api.twitch.tv/helix/clips?`;

            this.diff_ids.forEach((clipId) => {
                twitchClipsApiUrl+=`id=${clipId}&`;
            });

            var res = await axios.get(twitchClipsApiUrl,{
                headers: { 
                    'Authorization': 'Bearer '+this.token,
                    'Client-Id': '2hcw7jubxmk94gkrzhao4wbznzobjv'
                }
            });
            console.log(res.data);
            let clipsData = res.data.data;
                //逐筆上傳至CFDB
                for(let i=0; i<clipsData.length; i++){
                    await this.postToCFDB(clipsData[i]);
                }
            },
        async postToCFDB(clipData){
            const res = await axios.post('https://api-server.dsa83171.workers.dev/api/clips',clipData);
            console.log("上傳結果:", res.data);
        },
        //取得所有ID
        async getCFDB_IDs(){
            try {
                const res = await axios.get('https://api-server.dsa83171.workers.dev/api/clips/ids');
                return res.data.data; // 直接存 data，方便 computed 處理
            } catch (error) {
                console.error("抓取剪輯失敗:", error);
            }
        },
        //計算影片秒數
        formatDuration(seconds) { 
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },
        // 開啟影片撥放器
        openPlayer(clipId) {
            this.currentEmbedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}`;
            this.showPlayer = true;
        },
        // 關閉影片撥放器
        closePlayer() {
            this.showPlayer = false;
            this.currentEmbedUrl = '';
        },
        // 切換升降序
        toggleSortOrder() {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        },
        // 轉換日期
        formatLocalTime(utcString) {
            const date = new Date(utcString);
            const local = date.toLocaleString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }); // 根據使用者語系自動調整
            return local;
        }
    },
    computed:{
        sortedClips() {
            if(this.clips !=''){
                return [...this.clips.data].sort((a, b) => {
                    const valA = this.sortKey === 'created_at' ? new Date(a[this.sortKey]) : a[this.sortKey];
                    const valB = this.sortKey === 'created_at' ? new Date(b[this.sortKey]) : b[this.sortKey];
                
                    // 字串 or 數字通用比較
                    if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                    
                    return 0;
                });
            }
        },
        groupedByChannel() {
            if (this.sortKey !== 'broadcaster_name') return null;
        
            return this.clips.data.reduce((groups, clip) => {
                const key = clip.broadcaster_name || '未分類';
                if (!groups[key]) groups[key] = [];
                groups[key].push(clip);
                return groups;
            }, {});
        }
        
    }
})
app.mount("#main");