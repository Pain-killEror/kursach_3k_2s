package com.example.backend.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "global_settings")
public class GlobalSetting {

    @Id
    @Column(name = "s_key")
    private String sKey;

    @Column(name = "s_value")
    private String sValue;

    public GlobalSetting() {
    }

    public GlobalSetting(String sKey, String sValue) {
        this.sKey = sKey;
        this.sValue = sValue;
    }

    public String getsKey() {
        return sKey;
    }

    public void setsKey(String sKey) {
        this.sKey = sKey;
    }

    public String getsValue() {
        return sValue;
    }

    public void setsValue(String sValue) {
        this.sValue = sValue;
    }
}
