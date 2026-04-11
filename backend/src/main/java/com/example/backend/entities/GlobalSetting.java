package com.example.backend.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "global_settings")
public class GlobalSetting {

    @Id
    @Column(name = "setting_key", nullable = false)
    private String settingKey;

    @Column(name = "setting_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal settingValue;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public GlobalSetting() {}

    public GlobalSetting(String settingKey, BigDecimal settingValue, String description) {
        this.settingKey = settingKey;
        this.settingValue = settingValue;
        this.description = description;
    }

    public String getSettingKey() {
        return settingKey;
    }

    public void setSettingKey(String settingKey) {
        this.settingKey = settingKey;
    }

    public BigDecimal getSettingValue() {
        return settingValue;
    }

    public void setSettingValue(BigDecimal settingValue) {
        this.settingValue = settingValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}