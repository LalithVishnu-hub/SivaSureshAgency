console.log('[backend-init] Starting Supabase initialization...');

(function initSupabaseCompat() {
    const cfg = window.SSA_BACKEND || {};
    const fallbackCfg = {
        supabaseUrl: 'https://kyzlxhncnqahlpfhtoky.supabase.co',
        supabaseAnonKey: 'sb_publishable_0hcswuIONUUJPdBl7RRIHw_JH7MsGeK'
    };
    const provider = (cfg.provider || 'supabase').toLowerCase();
    const url = cfg.supabaseUrl || fallbackCfg.supabaseUrl || '';
    const anonKey = cfg.supabaseAnonKey || fallbackCfg.supabaseAnonKey || '';
    const storageBucket = cfg.storageBucket || 'assets';

    if (provider !== 'supabase') {
        console.warn('[backend-init] Unsupported provider:', provider);
    }

    if (!window.supabase || !window.supabase.createClient) {
        console.error('[backend-init] Supabase SDK not loaded');
        window._firebaseReady = false;
        return;
    }

    if (!url || !anonKey) {
        console.warn('[backend-init] Missing Supabase URL/Anon Key in js/backend-config.js');
        window._firebaseReady = false;
        return;
    }

    const client = window.supabase.createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    function _maybeTimestamp(v) {
        if (typeof v !== 'string') return v;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return v;
        return { seconds: Math.floor(d.getTime() / 1000), toDate: () => d };
    }

    function _normalizeRow(row) {
        if (!row || typeof row !== 'object') return row;
        const out = { ...row };
        Object.keys(out).forEach(k => {
            if (k.toLowerCase().endsWith('at')) out[k] = _maybeTimestamp(out[k]);
        });
        return out;
    }

    function _serverNow() {
        return new Date().toISOString();
    }

    function _isServerTime(v) {
        return v && typeof v === 'object' && v._fsOp === 'serverTime';
    }

    function _isIncrement(v) {
        return v && typeof v === 'object' && v._fsOp === 'increment';
    }

    function _plainForWrite(obj) {
        const out = {};
        Object.entries(obj || {}).forEach(([k, v]) => {
            if (_isServerTime(v)) out[k] = _serverNow();
            else if (!_isIncrement(v)) out[k] = v;
        });
        return out;
    }

    async function _currentSession() {
        const { data } = await client.auth.getSession();
        return data?.session || null;
    }

    let _cachedCompatUser = null;
    let _cachedRawUser = null;

    function _toCompatUser(session) {
        const u = session?.user;
        if (!u) return null;
        return {
            id: u.id,
            email: u.email || '',
            user_metadata: u.user_metadata || {},
            getIdToken: async () => session.access_token
        };
    }

    function _refreshCachedUserFromSession(session) {
        _cachedRawUser = session?.user || null;
        _cachedCompatUser = _toCompatUser(session);
    }

    client.auth.getSession().then(({ data }) => {
        _refreshCachedUserFromSession(data?.session || null);
    }).catch(() => {
        _cachedRawUser = null;
        _cachedCompatUser = null;
    });

    client.auth.onAuthStateChange((_event, session) => {
        _refreshCachedUserFromSession(session || null);
        if (_event === 'PASSWORD_RECOVERY') {
            window.dispatchEvent(new CustomEvent('ssa:passwordRecovery'));
        }
    });

    class ColRef {
        constructor(name) {
            this._name = name;
            this._wheres = [];
            this._order = null;
        }

        _clone() {
            const c = new ColRef(this._name);
            c._wheres = [...this._wheres];
            c._order = this._order;
            return c;
        }

        where(f, op, v) {
            const c = this._clone();
            c._wheres.push({ f, op, v });
            return c;
        }

        orderBy(f, dir) {
            const c = this._clone();
            c._order = { f, dir: dir === 'desc' ? 'desc' : 'asc' };
            return c;
        }

        async get() {
            let q = client.from(this._name).select('*');

            for (const { f, op, v } of this._wheres) {
                if (op === '==') q = q.eq(f, v);
                else if (op === '!=') q = q.neq(f, v);
                else if (op === '>') q = q.gt(f, v);
                else if (op === '>=') q = q.gte(f, v);
                else if (op === '<') q = q.lt(f, v);
                else if (op === '<=') q = q.lte(f, v);
                else if (op === 'in' && Array.isArray(v)) q = q.in(f, v);
            }

            if (this._order) q = q.order(this._order.f, { ascending: this._order.dir !== 'desc' });

            const { data, error } = await q;
            if (error) throw new Error(error.message || 'Database query failed');

            const docs = (data || []).map(row => ({
                id: row.id,
                data: () => _normalizeRow(row),
                exists: true
            }));

            return { docs, size: docs.length, empty: docs.length === 0 };
        }

        doc(id) {
            return new DocRef(this._name, id);
        }

        async add(obj) {
            const row = _plainForWrite(obj);
            if (!row.createdAt) row.createdAt = _serverNow();
            if (!row.updatedAt) row.updatedAt = _serverNow();
            if (!row.id) row.id = 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

            const { data, error } = await client.from(this._name).insert(row).select('id').single();
            if (error) throw new Error(error.message || 'Insert failed');
            return { id: data.id };
        }
    }

    class DocRef {
        constructor(col, id) {
            this._col = col;
            this._id = id;
        }

        async get() {
            const { data, error } = await client.from(this._col).select('*').eq('id', this._id).maybeSingle();
            if (error) throw new Error(error.message || 'Get failed');
            if (!data) return { id: this._id, data: () => ({}), exists: false };
            return { id: data.id, data: () => _normalizeRow(data), exists: true };
        }

        async set(obj, opts) {
            const row = _plainForWrite(obj);
            row.id = this._id;
            if (!row.updatedAt) row.updatedAt = _serverNow();
            if (!row.createdAt) row.createdAt = _serverNow();

            if (opts && opts.merge) {
                const existing = await this.get();
                const merged = { ...(existing.exists ? existing.data() : {}), ...row, id: this._id };
                const { error } = await client.from(this._col).upsert(merged, { onConflict: 'id' });
                if (error) throw new Error(error.message || 'Merge set failed');
                return;
            }

            const { error } = await client.from(this._col).upsert(row, { onConflict: 'id' });
            if (error) throw new Error(error.message || 'Set failed');
        }

        async update(obj) {
            const row = _plainForWrite(obj);
            row.updatedAt = _serverNow();

            const incEntries = Object.entries(obj || {}).filter(([, v]) => _isIncrement(v));
            if (incEntries.length) {
                const existing = await this.get();
                const base = existing.exists ? existing.data() : {};
                incEntries.forEach(([k, v]) => {
                    row[k] = (Number(base[k]) || 0) + Number(v._n || 0);
                });
            }

            const { error } = await client.from(this._col).update(row).eq('id', this._id);
            if (error) throw new Error(error.message || 'Update failed');
        }

        async delete() {
            const { error } = await client.from(this._col).delete().eq('id', this._id);
            if (error) throw new Error(error.message || 'Delete failed');
        }
    }

    window.db = { collection: (name) => new ColRef(name) };
    window.fireDb = window.db;

    window.fsServerTimestamp = () => ({ _fsOp: 'serverTime' });
    window.fsIncrement = (n) => ({ _fsOp: 'increment', _n: Number(n || 0) });

    window.auth = {
        onAuthStateChanged: (cb) => {
            client.auth.getSession().then(({ data }) => cb(data?.session?.user || null));
            return client.auth.onAuthStateChange((_event, session) => {
                _refreshCachedUserFromSession(session || null);
                cb(session?.user || null);
            });
        },
        signInWithEmailAndPassword: async (email, password) => {
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw new Error(error.message || 'Sign-in failed');
            return data;
        },
        signUpWithEmailAndPassword: async (email, password, metadata) => {
            const { data, error } = await client.auth.signUp({ email, password, options: { data: metadata || {} } });
            if (error) throw new Error(error.message || 'Sign-up failed');
            return data;
        },
        signOut: async () => {
            const { error } = await client.auth.signOut();
            if (error) throw new Error(error.message || 'Sign-out failed');
        },
        signInAnonymously: async () => ({ ok: true }),
        updatePassword: async (password) => {
            const { error } = await client.auth.updateUser({ password });
            if (error) throw new Error(error.message || 'Password update failed');
        },
        sendPasswordResetEmail: async (email) => {
            const _path = window.location.pathname;
            const _base = _path.endsWith('/') ? _path : _path.replace(/[^/]+$/, '');
            const redirectTo = window.location.origin + _base;
            const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw new Error(error.message || 'Reset email failed');
        },
        currentUser: () => _cachedCompatUser
    };

    window.storage = {
        ref: (path) => path,
        uploadBytes: async (refPath, data) => {
            const { data: out, error } = await client.storage.from(storageBucket).upload(refPath, data, { upsert: true });
            if (error) throw new Error(error.message || 'Upload failed');
            return out;
        },
        getDownloadURL: async (refPath) => {
            const { data } = client.storage.from(storageBucket).getPublicUrl(refPath);
            return data.publicUrl;
        },
        deleteObject: async (refPath) => {
            const { error } = await client.storage.from(storageBucket).remove([refPath]);
            if (error) throw new Error(error.message || 'Delete failed');
        }
    };

    window.getCurrentUser = () => _cachedRawUser;
    window._firebaseReady = true;

    console.log('[backend-init] Supabase compat ready');
})();
