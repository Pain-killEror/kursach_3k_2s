package com.example.backend.repositories;

import com.example.backend.entities.GlobalSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GlobalSettingRepository extends JpaRepository<GlobalSetting, String> {
    Optional<GlobalSetting> findBySettingKey(String settingKey);
}
