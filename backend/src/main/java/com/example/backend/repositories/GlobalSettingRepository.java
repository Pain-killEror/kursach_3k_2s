package com.example.backend.repositories;

import com.example.backend.entities.GlobalSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GlobalSettingRepository extends JpaRepository<GlobalSetting, String> {
}
